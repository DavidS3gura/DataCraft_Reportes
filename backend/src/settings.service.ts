import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface SettingsData {
  notificationPhone?: string;
  notificationUrl?: string;
  notificationEnabled?: boolean;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    let settings = await this.prisma.appSettings.findFirst();
    if (!settings) settings = await this.prisma.appSettings.create({ data: {} });
    return settings;
  }

  async update(data: SettingsData) {
    const current = await this.get();
    return this.prisma.appSettings.update({
      where: { id: current.id },
      data,
    });
  }
}
