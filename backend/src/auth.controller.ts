/*
 * DataCraft Reportes
 * Desarrollado por Dev DataCraft - Ing. Ivan Mejia
 */
import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(4) password!: string;
}
class RefreshDto { @IsString() refreshToken!: string; }

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }
  @Post('refresh') refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }
  @Post('logout') logout(@Body() dto: RefreshDto) { return this.auth.logout(dto.refreshToken); }
}
