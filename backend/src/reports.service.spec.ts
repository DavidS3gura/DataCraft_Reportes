/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const prisma: any = {};
  const storage: any = { save: jest.fn(), remove: jest.fn(), url: (key: string) => `/api/files/${key}` };
  const service = new ReportsService(prisma, storage);

  it('rechaza un reporte sin fotografías', async () => {
    await expect(service.create({
      reporterName: 'Ana Pérez', description: 'Una descripción válida del daño.',
      priority: 'HIGH', locationId: 'location', areaId: 'area', placeId: 'place',
    }, [])).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza más de tres fotografías', async () => {
    const files = [{}, {}, {}, {}] as Express.Multer.File[];
    await expect(service.create({
      reporterName: 'Ana Pérez', description: 'Una descripción válida del daño.',
      priority: 'HIGH', locationId: 'location', areaId: 'area', placeId: 'place',
    }, files)).rejects.toThrow('entre 1 y 3');
  });

  it('valida la longitud mínima de la descripción', async () => {
    await expect(service.create({
      reporterName: 'Ana Pérez', description: 'corta',
      priority: 'HIGH', locationId: 'location', areaId: 'area', placeId: 'place',
    }, [{} as Express.Multer.File])).rejects.toThrow('descripción');
  });

  it('rechaza una transición inválida y un rechazo sin motivo', async () => {
    prisma.report = { findUnique: jest.fn().mockResolvedValue({ id: 'r1', status: 'REPORTED' }) };
    await expect(service.updateStatus('r1', 'REPORTED' as any, 'u1')).rejects.toThrow('No se puede pasar');
    await expect(service.updateStatus('r1', 'REJECTED' as any, 'u1')).rejects.toThrow('motivo');
  });

  it('rechaza una prioridad desconocida', async () => {
    prisma.report = { findUnique: jest.fn().mockResolvedValue({ id: 'r1', status: 'REPORTED' }) };
    await expect(service.updateStatus('r1', 'UNDER_REVIEW' as any, 'u1')).rejects.toBeDefined();
  });
});