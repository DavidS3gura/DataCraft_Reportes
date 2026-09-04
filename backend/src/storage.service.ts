/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface StoredFile { key: string; size: number; }

@Injectable()
export class StorageService {
  private readonly root = process.env.STORAGE_PATH || join(process.cwd(), 'storage', 'uploads');

  async save(file: Express.Multer.File): Promise<StoredFile> {
    const extension = (file.originalname.split('.').pop() || 'bin').toLowerCase();
    const key = `${new Date().getFullYear()}/${randomUUID()}.${extension}`;
    const destination = join(this.root, key);
    await mkdir(join(destination, '..'), { recursive: true });
    await writeFile(destination, file.buffer, { flag: 'wx' });
    return { key, size: file.size };
  }

  url(key: string): string {
    return `/api/files/${encodeURIComponent(key)}`;
  }

  path(key: string): string {
    const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, '');
    return join(this.root, safe);
  }

  async remove(key: string) {
    try { await unlink(this.path(key)); } catch { /* cleanup is best effort */ }
  }
}
