/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AppModule } from './app.module';
import { PrismaService } from './prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  const configuredOrigins = process.env.FRONTEND_URL?.split(',').map((origin) => origin.trim()).filter(Boolean) || [];
  const allowedOrigins = [...new Set([...configuredOrigins, 'http://localhost:5173', 'http://localhost:8080'])];
  app.enableCors({ origin: allowedOrigins, credentials: false });
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
  const swagger = new DocumentBuilder().setTitle('DataCraft Reportes API').setDescription('API para reportes de infraestructura').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  app.getHttpAdapter().get('/api/health', async (_req: unknown, res: any) => {
    try { await app.get(PrismaService).$queryRaw`SELECT 1`; res.status(200).json({ status: 'ok', service: 'datacraft-reportes' }); }
    catch { res.status(503).json({ status: 'error', service: 'datacraft-reportes' }); }
  });
  await app.listen(Number(process.env.PORT || 3000), '0.0.0.0');
}
bootstrap();
