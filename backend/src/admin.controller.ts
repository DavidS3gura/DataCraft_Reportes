/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ReportStatus, Role } from '@prisma/client';
import { Request } from 'express';
import { AuthUser, JwtAuthGuard, Roles, RolesGuard } from './auth';
import { AuthService } from './auth.service';
import { ReportsService } from './reports.service';

class StatusDto {
  @IsEnum(ReportStatus) status!: ReportStatus;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
class CommentDto {
  @IsString() @MinLength(1) @MaxLength(1000) body!: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}
class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() @MinLength(4) @MaxLength(100) password!: string;
  @IsIn(['ADMIN', 'SUPER_ADMIN']) role!: 'ADMIN' | 'SUPER_ADMIN';
}
class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) name?: string;
  @IsOptional() @IsIn(['ADMIN', 'SUPER_ADMIN']) role?: 'ADMIN' | 'SUPER_ADMIN';
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class ResetPasswordDto {
  @IsString() @MinLength(4) @MaxLength(100) password!: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly reports: ReportsService, private readonly auth: AuthService) {}
  @Get('dashboard') dashboard() { return this.reports.dashboard(); }
  @Get('reports') list(@Query() query: Record<string, string>) { return this.reports.list(query); }
  @Get('reports/:id') detail(@Param('id') id: string) { return this.reports.detail(id); }
  @Patch('reports/:id/status')
  status(@Param('id') id: string, @Body() body: StatusDto, @Req() req: Request & { user: AuthUser }) {
    return this.reports.updateStatus(id, body.status, req.user.sub, body.note);
  }
  @Post('reports/:id/comments')
  comment(@Param('id') id: string, @Body() body: CommentDto, @Req() req: Request & { user: AuthUser }) {
    return this.reports.addComment(id, req.user.sub, body.body, body.isPublic === true);
  }

  @Get('users')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  users(@Req() req: Request & { user: AuthUser }) { return this.auth.listUsers(req.user.role); }

  @Post('users')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createUser(@Body() body: CreateUserDto, @Req() req: Request & { user: AuthUser }) { return this.auth.createUser(req.user.role, body); }

  @Patch('users/:id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  updateUser(@Param('id') id: string, @Body() body: UpdateUserDto, @Req() req: Request & { user: AuthUser }) { return this.auth.updateUser(req.user.role, req.user.sub, id, body); }

  @Patch('users/:id/password')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  resetPassword(@Param('id') id: string, @Body() body: ResetPasswordDto, @Req() req: Request & { user: AuthUser }) { return this.auth.resetPassword(req.user.role, req.user.sub, id, body.password); }

  @Delete('users/:id')
  @Roles(Role.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  deleteUser(@Param('id') id: string, @Req() req: Request & { user: AuthUser }) { return this.auth.deleteUser(req.user.role, req.user.sub, id); }
}
