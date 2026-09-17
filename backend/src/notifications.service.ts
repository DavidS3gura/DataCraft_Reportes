import { Injectable, Logger } from '@nestjs/common';
import twilio from 'twilio';
import { SettingsService } from './settings.service';

const PRIORITY_LABEL: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly settings: SettingsService) {}

  private normalizePhone(phone: string): string | null {
    let raw = phone.trim().replace(/[\s\-]/g, '');
    if (raw.startsWith('whatsapp:')) {
      raw = raw.slice(9);
    }

    if (raw.startsWith('+')) {
      return raw;
    }

    if (/^57\d{10}$/.test(raw)) {
      return `+${raw}`;
    }

    if (/^\d{10}$/.test(raw)) {
      return `+57${raw}`;
    }

    return null;
  }

  private buildMessage(report: any): string {
    const priority = PRIORITY_LABEL[report.priority] || report.priority || 'No indicada';
    const location = report.location?.name || 'No indicada';
    const area = report.area?.name || 'No indicada';
    const place = report.place?.name || 'No indicado';
    const reporter = report.reporterName || 'No indicado';

    return `🚨 *Nuevo reporte registrado*

*Código:* ${report.code}
*Prioridad:* ${priority}

📍 *Sede:* ${location}
*Área:* ${area}
*Lugar:* ${place}

👤 *Reportado por:* ${reporter}

Se ha registrado un nuevo incidente en la plataforma Reportes.

Consultar los detalles en:
https://reportesineansa.datacraft.website`;
  }

  async sendReportCreated(report: any) {
    const settings = await this.settings.get();
    if (!settings.notificationEnabled || !settings.notificationPhone) {
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !from) {
      this.logger.warn('Faltan variables de entorno de Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN o TWILIO_WHATSAPP_FROM');
      return;
    }

    const phone = this.normalizePhone(settings.notificationPhone);
    if (!phone) {
      this.logger.warn(`Número de notificación no válido: ${settings.notificationPhone}`);
      return;
    }

    const to = `whatsapp:${phone}`;
    const body = this.buildMessage(report);

    try {
      const client = twilio(accountSid, authToken);
      const message = await client.messages.create({ body, from, to });
      this.logger.log(`WhatsApp enviado. SID: ${message.sid}`);
    } catch (error: any) {
      if (error?.code === 21608 || error?.message?.toLowerCase().includes('not a valid')) {
        this.logger.error(`El destinatario ${phone} no ha sido vinculado al Sandbox de Twilio. Debe enviar "join twilio-trial" a ${from}.`);
      } else if (error?.code) {
        this.logger.error(`Twilio error ${error.code}: ${error.message}`);
      } else {
        this.logger.error(`Error enviando WhatsApp: ${error?.message || error}`);
      }
    }
  }
}
