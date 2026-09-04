/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    const payload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const accessToken = this.jwt.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
      expiresIn: process.env.ACCESS_TOKEN_TTL || '15m',
    });
    const rawRefresh = randomBytes(48).toString('hex');
    const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7);
    await this.prisma.refreshToken.create({
      data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + days * 86400000) },
    });
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id } });
    return { accessToken, refreshToken: rawRefresh, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) throw new BadRequestException('Refresh token requerido');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) throw new UnauthorizedException('Refresh token inválido');
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const payload = { sub: stored.user.id, email: stored.user.email, name: stored.user.name, role: stored.user.role };
    const accessToken = this.jwt.sign(payload, { secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret', expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });
    return { accessToken };
  }

  async logout(refreshToken: string) {
    if (refreshToken) {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.refreshToken.deleteMany({ where: { tokenHash } });
    }
    return { success: true };
  }

  async listUsers(actorRole: string) {
    if (actorRole !== 'SUPER_ADMIN') throw new ForbiddenException('No tienes permisos para ver usuarios');
    const users = await this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true } });
    return users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, isActive: u.isActive, createdAt: u.createdAt }));
  }

  async createUser(actorRole: string, data: { email: string; name: string; password: string; role: string }) {
    if (actorRole !== 'SUPER_ADMIN') throw new ForbiddenException('No tienes permisos para crear usuarios');
    const email = data.email?.toLowerCase().trim();
    const name = data.name?.trim();
    const password = data.password;
    const role = data.role?.toUpperCase().trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('El correo no es válido');
    if (!name || name.length < 2 || name.length > 100) throw new BadRequestException('El nombre debe tener entre 2 y 100 caracteres');
    if (!password || password.length < 4 || password.length > 100) throw new BadRequestException('La contraseña debe tener entre 4 y 100 caracteres');
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') throw new BadRequestException('El rol no es válido');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Ya existe un usuario con ese correo');
    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({ data: { email, name, passwordHash, role }, select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true } });
    return user;
  }

  async updateUser(actorRole: string, actorId: string, id: string, data: { name?: string; role?: string; isActive?: boolean }) {
    if (actorRole !== 'SUPER_ADMIN') throw new ForbiddenException('No tienes permisos para editar usuarios');
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new BadRequestException('Usuario no encontrado');
    if (id === actorId) {
      if (data.isActive === false) throw new BadRequestException('No puedes desactivarte a ti mismo');
      if (data.role && data.role !== 'SUPER_ADMIN') throw new BadRequestException('No puedes cambiar tu propio rol');
    }
    if (data.role !== undefined && data.role !== 'ADMIN' && data.role !== 'SUPER_ADMIN') throw new BadRequestException('El rol no es válido');
    if (data.name !== undefined) {
      const name = data.name.trim();
      if (!name || name.length < 2 || name.length > 100) throw new BadRequestException('El nombre debe tener entre 2 y 100 caracteres');
    }
    if (data.isActive === false && target.role === 'SUPER_ADMIN') {
      const activeSuper = await this.prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } });
      if (activeSuper <= 1) throw new BadRequestException('Debe quedar al menos un super administrador activo');
    }
    const update: any = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.role !== undefined) update.role = data.role;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    const user = await this.prisma.user.update({ where: { id }, data: update, select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true } });
    return user;
  }

  async resetPassword(actorRole: string, actorId: string, id: string, password: string) {
    if (actorRole !== 'SUPER_ADMIN') throw new ForbiddenException('No tienes permisos para restablecer contraseñas');
    if (!password || password.length < 4 || password.length > 100) throw new BadRequestException('La contraseña debe tener entre 4 y 100 caracteres');
    const passwordHash = await argon2.hash(password);
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
    return { success: true };
  }

  async deleteUser(actorRole: string, actorId: string, id: string) {
    if (actorRole !== 'SUPER_ADMIN') throw new ForbiddenException('No tienes permisos para eliminar usuarios');
    if (id === actorId) throw new BadRequestException('No puedes eliminar tu propio usuario');
    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new BadRequestException('Usuario no encontrado');
    if (target.role === 'SUPER_ADMIN') {
      const activeSuper = await this.prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true } });
      if (activeSuper <= 1) throw new BadRequestException('Debe quedar al menos un super administrador activo');
    }
    try {
      await this.prisma.$transaction([this.prisma.refreshToken.deleteMany({ where: { userId: id } }), this.prisma.user.delete({ where: { id } })]);
    } catch (e) { throw new BadRequestException('No se puede eliminar el usuario porque tiene registros asociados (comentarios o acciones)'); }
    return { success: true };
  }
}
