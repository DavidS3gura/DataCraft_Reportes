/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { StorageService } from './storage.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocationsController } from './locations.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AdminController } from './admin.controller';
import { FilesController } from './files.controller';
import { RolesGuard } from './auth';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), JwtModule.register({})],
  controllers: [AuthController, LocationsController, ReportsController, AdminController, FilesController],
  providers: [PrismaService, StorageService, AuthService, ReportsService, RolesGuard],
})
export class AppModule {}
