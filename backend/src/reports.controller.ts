/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReportsService } from './reports.service';

const allowed = ['image/jpeg', 'image/png', 'image/webp'];

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 3, {
    storage: memoryStorage(),
    limits: { files: 3, fileSize: Number(process.env.MAX_IMAGE_SIZE_MB || 8) * 1024 * 1024 },
    fileFilter: (_req, file, callback) => callback(null, allowed.includes(file.mimetype)),
  }))
  create(@Body() body: Record<string, string>, @UploadedFiles() files: Express.Multer.File[]) {
    if ((body as any).images || (files?.length && files.some((file) => !allowed.includes(file.mimetype)))) throw new BadRequestException('Solo se aceptan JPG, PNG y WEBP');
    return this.reports.create(body as any, files || []);
  }

  @Get('code/:code')
  findPublic(@Param('code') code: string) { return this.reports.findPublic(code); }
}
