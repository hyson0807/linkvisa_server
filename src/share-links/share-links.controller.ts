import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { OptionalJwtAccessGuard } from '../common/guards/optional-jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ShareLinksService } from './share-links.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { SESSION_TOKEN_HEADER } from '../common/constants';

function getSessionTokenFromReq(req: Request): string | null {
  return (req.headers[SESSION_TOKEN_HEADER] as string) ?? null;
}

@Controller('share-links')
export class ShareLinksController {
  constructor(private shareLinksService: ShareLinksService) {}

  @Post()
  @UseGuards(OptionalJwtAccessGuard)
  async create(
    @CurrentUser('id') userId: string | null,
    @Body() dto: CreateShareLinkDto,
    @Req() req: Request,
  ) {
    return this.shareLinksService.create(userId, getSessionTokenFromReq(req), dto);
  }

  @Get(':token')
  async getInfo(@Param('token') token: string) {
    return this.shareLinksService.getInfo(token);
  }

  @Post(':token/upload/:docId')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('token') token: string,
    @Param('docId') docId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.shareLinksService.uploadViaToken(token, docId, file);
  }

  @Delete(':token')
  @UseGuards(JwtAccessGuard)
  async deactivate(
    @CurrentUser('id') userId: string,
    @Param('token') token: string,
  ) {
    await this.shareLinksService.deactivate(userId, token);
  }
}
