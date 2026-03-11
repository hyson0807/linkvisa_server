import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { JwtRefreshGuard } from '../common/guards/jwt-refresh.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.signup(dto);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } =
      await this.authService.login(dto);
    this.setTokenCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Post('logout')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    this.clearTokenCookies(res);
    return { message: '로그아웃되었습니다' };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: { id: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.refresh(user.id, user.refreshToken);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user };
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }

  private isProduction(): boolean {
    return this.configService.get('NODE_ENV') === 'production';
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const secure = this.isProduction();

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/auth/refresh',
    });
  }

  private clearTokenCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  }
}
