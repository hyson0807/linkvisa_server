import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly clientUrls: string[];

  constructor(configService: ConfigService) {
    this.clientUrls = configService
      .get('CLIENT_URL', 'http://localhost:3000')
      .split(',')
      .map((url: string) => url.trim());
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return next();
    }

    const requestedWith = req.headers['x-requested-with'];
    if (!requestedWith) {
      throw new ForbiddenException('X-Requested-With 헤더가 필요합니다');
    }

    const origin = req.headers['origin'];
    if (origin && !this.clientUrls.includes(origin)) {
      throw new ForbiddenException('허용되지 않은 Origin입니다');
    }

    next();
  }
}
