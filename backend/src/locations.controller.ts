/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('public')
  list() {
    return this.prisma.location.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { areas: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, include: { places: { where: { isActive: true }, orderBy: { name: 'asc' } } } } },
    });
  }
}
