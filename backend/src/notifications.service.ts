import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly settings: SettingsService) {}

  async sendReportCreated(report: any) {
    const settings = await this.settings.get();
    if (!settings.notificationEnabled || !settings.notificationPhone || !settings.notificationUrl) {
      return;
    }

    const location = [report.location?.name, report.area?.name, report.place?.name]
      .filter(Boolean)
      .join(' - ');

    const message = `Nuevo reporte ${report.code} de prioridad ${report.priority} en ${location}. Reportado por ${report.reporterName}.`;

    const payload = {
      phone: settings.notificationPhone,
      message,
      report: {
        code: report.code,
        reporterName: report.reporterName,
        priority: report.priority,
        description: report.description,
        location: report.location?.name,
        area: report.area?.name,
        place: report.place?.name,
      },
    };

    try {
      const res = await fetch(settings.notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        this.logger.warn(`Notificación fallida: ${res.status} ${res.statusText}`);
      }
    } catch (error) {
      this.logger.error(`Error enviando notificación: ${(error as Error).message}`);
    }
  }
}
