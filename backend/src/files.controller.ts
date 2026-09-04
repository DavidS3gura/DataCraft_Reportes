/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { Controller, Get, Param, Res } from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { Response } from 'express';
import { StorageService } from './storage.service';

@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}
  @Get(':key(*)')
  async file(@Param('key') key: string, @Res() response: Response) {
    const path = this.storage.path(decodeURIComponent(key));
    response.sendFile(path, (error) => { if (error && !response.headersSent) response.status(404).json({ message: 'Archivo no encontrado' }); });
  }
}
