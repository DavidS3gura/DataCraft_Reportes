/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Priority, ReportStatus } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { NotificationsService } from './notifications.service';
import { randomUUID } from 'node:crypto';

const reportInclude = {
  location: true, area: true, place: true,
  images: true,
  statusHistory: { orderBy: { createdAt: 'asc' as const }, include: { user: { select: { name: true } } } },
  comments: { orderBy: { createdAt: 'asc' as const }, include: { user: { select: { name: true } } } },
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly notifications: NotificationsService) {}

  async locations() { return this.prisma.location.findMany({ where: { isActive: true }, include: { areas: { include: { places: true } } } }); }

  private parsePriority(priority: string): Priority {
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(priority)) throw new BadRequestException('Prioridad no válida');
    return priority as Priority;
  }

  async create(input: { reporterName: string; description: string; priority: string; locationId: string; areaId: string; placeId: string; locationName?: string; areaName?: string; placeName?: string }, files: Express.Multer.File[]) {
    const reporterName = input.reporterName?.trim();
    const description = input.description?.trim();
    if (!reporterName || reporterName.length < 2 || reporterName.length > 100) throw new BadRequestException('El nombre debe tener entre 2 y 100 caracteres');
    if (!description || description.length < 10 || description.length > 500) throw new BadRequestException('La descripción debe tener entre 10 y 500 caracteres');
    if (!files?.length || files.length > 3) throw new BadRequestException('Agrega entre 1 y 3 fotografías');
    const locationName = input.locationName?.trim();
    const areaName = input.areaName?.trim();
    const placeName = input.placeName?.trim();
    for (const name of [locationName, areaName, placeName]) if (name !== undefined && name !== '' && (name.length < 2 || name.length > 100)) throw new BadRequestException('Los nombres de ubicación deben tener entre 2 y 100 caracteres');
    let location = input.locationId ? await this.prisma.location.findFirst({ where: { id: input.locationId, isActive: true } }) : null;
    if (!location && locationName) location = (await this.prisma.location.findFirst({ where: { name: { equals: locationName, mode: 'insensitive' } } })) ?? (await this.prisma.location.create({ data: { name: locationName } }));
    if (!location) throw new BadRequestException('La sede seleccionada no es válida');
    let area = input.areaId ? await this.prisma.locationArea.findFirst({ where: { id: input.areaId, locationId: location.id, isActive: true } }) : null;
    if (!area && areaName) area = (await this.prisma.locationArea.findFirst({ where: { locationId: location.id, name: { equals: areaName, mode: 'insensitive' } } })) ?? (await this.prisma.locationArea.create({ data: { name: areaName, locationId: location.id } }));
    if (!area) throw new BadRequestException('El área seleccionada no es válida');
    let place = input.placeId ? await this.prisma.locationPlace.findFirst({ where: { id: input.placeId, areaId: area.id, isActive: true } }) : null;
    if (!place && placeName) place = (await this.prisma.locationPlace.findFirst({ where: { areaId: area.id, name: { equals: placeName, mode: 'insensitive' } } })) ?? (await this.prisma.locationPlace.create({ data: { name: placeName, areaId: area.id } }));
    if (!place) throw new BadRequestException('El lugar seleccionado no es válido');
    const stored: { key: string; file: Express.Multer.File }[] = [];
    try {
      for (const file of files) stored.push({ key: (await this.storage.save(file)).key, file });
      const report = await this.prisma.$transaction(async (tx) => {
        const created = await tx.report.create({
          data: {
            code: `DRAFT-${randomUUID()}`,
            reporterName, description, priority: this.parsePriority(input.priority),
            locationId: location.id, areaId: area.id, placeId: place.id,
            images: { create: stored.map(({ key, file }) => ({ storageKey: key, originalName: file.originalname, mimeType: file.mimetype, size: file.size })) },
            statusHistory: { create: { to: ReportStatus.REPORTED } },
          },
        });
        const code = `INC-${created.createdAt.getFullYear()}-${String(created.sequence).padStart(6, '0')}`;
        return tx.report.update({ where: { id: created.id }, data: { code }, include: reportInclude });
      });
      await this.notifications.sendReportCreated(report);
      return this.publicShape(report);
    } catch (error) {
      await Promise.all(stored.map(({ key }) => this.storage.remove(key)));
      throw error;
    }
  }

  async findPublic(code: string) {
    const report = await this.prisma.report.findUnique({ where: { code: code.toUpperCase() }, include: reportInclude });
    if (!report) throw new NotFoundException('No encontramos un reporte con ese código');
    return this.publicShape(report);
  }

  async list(query: { status?: string; priority?: string; locationId?: string; areaId?: string; search?: string; from?: string; to?: string }) {
    const where: Prisma.ReportWhereInput = {};
    if (query.status && Object.values(ReportStatus).includes(query.status as ReportStatus)) where.status = query.status as ReportStatus;
    if (query.priority && Object.values(Priority).includes(query.priority as Priority)) where.priority = query.priority as Priority;
    if (query.locationId) where.locationId = query.locationId;
    if (query.areaId) where.areaId = query.areaId;
    if (query.search) where.OR = [{ code: { contains: query.search, mode: 'insensitive' } }, { reporterName: { contains: query.search, mode: 'insensitive' } }, { description: { contains: query.search, mode: 'insensitive' } }];
    if (query.from || query.to) where.createdAt = { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(`${query.to}T23:59:59`) } : {}) };
    const reports = await this.prisma.report.findMany({ where, orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }], include: { location: true, area: true, place: true, images: true }, take: 100 });
    return reports.map((report) => ({ ...report, images: report.images.map((image) => ({ ...image, url: this.storage.url(image.storageKey) })) }));
  }

  async detail(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id }, include: reportInclude });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return { ...report, images: report.images.map((image) => ({ ...image, url: this.storage.url(image.storageKey) })) };
  }

  async dashboard() {
    const [total, grouped, high, recent] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.groupBy({ by: ['status'], _count: true }),
      this.prisma.report.count({ where: { priority: 'HIGH', status: { not: 'RESOLVED' } } }),
      this.prisma.report.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { location: true, area: true, place: true, images: true } }),
    ]);
    const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count]));
    return { total, reported: counts.REPORTED || 0, underReview: counts.UNDER_REVIEW || 0, inProgress: counts.IN_PROGRESS || 0, resolved: counts.RESOLVED || 0, highPriority: high, recent: recent.map((r) => ({ ...r, images: r.images.map((i) => ({ ...i, url: this.storage.url(i.storageKey) })) })) };
  }

  private publicShape(report: any) {
    return {
      id: report.id, code: report.code, reporterName: report.reporterName, description: report.description,
      priority: report.priority, status: report.status, createdAt: report.createdAt, updatedAt: report.updatedAt, resolvedAt: report.resolvedAt,
      location: report.location, area: report.area, place: report.place,
      images: report.images?.map((image: any) => ({ id: image.id, url: this.storage.url(image.storageKey), mimeType: image.mimeType })),
      statusHistory: report.statusHistory?.map((event: any) => ({ id: event.id, from: event.from, to: event.to, note: event.note, createdAt: event.createdAt })),
      comments: report.comments?.filter((c: any) => c.isPublic).map((c: any) => ({ id: c.id, body: c.body, createdAt: c.createdAt })),
    };
  }

  async updateStatus(id: string, to: ReportStatus, userId: string, note?: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    const allowed: Record<ReportStatus, ReportStatus[]> = { REPORTED: ['UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'], UNDER_REVIEW: ['IN_PROGRESS', 'RESOLVED', 'REJECTED'], IN_PROGRESS: ['RESOLVED', 'REJECTED'], RESOLVED: [], REJECTED: [] };
    if (!allowed[report.status].includes(to)) throw new BadRequestException(`No se puede pasar de ${report.status} a ${to}`);
    if (to === 'REJECTED' && (!note || note.trim().length < 5)) throw new BadRequestException('El rechazo requiere un motivo');
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.report.update({ where: { id }, data: { status: to, resolvedAt: to === 'RESOLVED' ? new Date() : null, rejectedReason: to === 'REJECTED' ? note?.trim() : null }, include: reportInclude });
      await tx.statusHistory.create({ data: { reportId: id, userId, from: report.status, to, note: note?.trim() } });
      await tx.auditLog.create({ data: { userId, action: to === 'REJECTED' ? 'REJECT' : to === 'RESOLVED' ? 'RESOLVE' : 'STATUS_CHANGE', entity: 'Report', entityId: id, values: { from: report.status, to, note } } });
      return next;
    });
    return this.detail(updated.id);
  }

  async addComment(id: string, userId: string, body: string, isPublic = false) {
    if (!body?.trim() || body.trim().length > 1000) throw new BadRequestException('La observación debe tener entre 1 y 1000 caracteres');
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    await this.prisma.reportComment.create({ data: { reportId: id, userId, body: body.trim(), isPublic } });
    await this.prisma.auditLog.create({ data: { userId, action: isPublic ? 'PUBLIC_COMMENT' : 'COMMENT', entity: 'Report', entityId: id, values: { body: body.trim(), isPublic } } });
    return this.detail(id);
  }
}
