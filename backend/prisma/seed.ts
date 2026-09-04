/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { PrismaClient, Priority, ReportStatus, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await argon2.hash('DataCraft2026!');
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@datacraft.local' } });
  if (!adminExists) {
    await prisma.user.create({ data: { email: 'admin@datacraft.local', passwordHash: adminHash, name: 'Administración DataCraft', role: Role.ADMIN } });
    console.log('Seed: admin creado');
  }
  const superHash = await argon2.hash('0911');
  const superExists = await prisma.user.findUnique({ where: { email: 'webidms1@gmail.com' } });
  if (!superExists) {
    await prisma.user.create({ data: { email: 'webidms1@gmail.com', passwordHash: superHash, name: 'Superadministrador', role: Role.SUPER_ADMIN } });
    console.log('Seed: superadmin creado');
  }
  const campus = await prisma.location.upsert({ where: { id: 'campus-principal' }, update: {}, create: { id: 'campus-principal', name: 'Campus Principal', sortOrder: 1 } });
  const areas = [
    { id: 'area-bloque-a', name: 'Bloque A', places: ['Salón 101', 'Salón 102'] },
    { id: 'area-bloque-b', name: 'Bloque B', places: ['Salón 201', 'Salón 202'] },
    { id: 'area-comunes', name: 'Zonas comunes', places: ['Cafetería', 'Baños', 'Pasillo principal'] },
  ];
  for (const [index, item] of areas.entries()) {
    const area = await prisma.locationArea.upsert({ where: { id: item.id }, update: { name: item.name }, create: { id: item.id, name: item.name, locationId: campus.id, sortOrder: index + 1 } });
    for (const placeName of item.places) await prisma.locationPlace.upsert({ where: { areaId_name: { areaId: area.id, name: placeName } }, update: {}, create: { areaId: area.id, name: placeName } });
  }
  const place = await prisma.locationPlace.findFirstOrThrow({ where: { areaId: 'area-bloque-b', name: 'Salón 201' } });
  const area = await prisma.locationArea.findUniqueOrThrow({ where: { id: 'area-bloque-b' } });
  const existing = await prisma.report.count();
  if (existing === 0) {
    for (const [i, data] of [
      { reporterName: 'Mariana López', description: 'El ventilador del fondo no enciende y produce un ruido fuerte.', priority: Priority.HIGH, status: ReportStatus.UNDER_REVIEW },
      { reporterName: 'Carlos Ruiz', description: 'La luminaria sobre la puerta presenta intermitencias.', priority: Priority.MEDIUM, status: ReportStatus.REPORTED },
    ].entries()) {
      const report = await prisma.report.create({ data: { code: `INC-${new Date().getFullYear()}-${String(i + 1).padStart(6, '0')}`, reporterName: data.reporterName, description: data.description, priority: data.priority, status: data.status, locationId: campus.id, areaId: area.id, placeId: place.id, statusHistory: { create: [{ to: ReportStatus.REPORTED }, ...(data.status !== ReportStatus.REPORTED ? [{ to: data.status }] : [])] } } });
      console.log(`Seed report: ${report.code}`);
    }
  }
  console.log('Seed complete');
}

main().finally(() => prisma.$disconnect());
