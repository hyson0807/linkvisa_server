import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { OptionalJwtAccessGuard } from '../common/guards/optional-jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SESSION_TOKEN_HEADER } from '../common/constants';
import { CasesService } from '../cases/cases.service';
import { DocumentsService } from './documents.service';

function getSessionTokenFromReq(req: Request): string | null {
  return (req.headers[SESSION_TOKEN_HEADER] as string) ?? null;
}

@Controller('cases/:caseId/documents')
@UseGuards(OptionalJwtAccessGuard)
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private casesService: CasesService,
  ) {}

  private async assertAccess(
    caseId: string,
    userId: string | null,
    req: Request,
  ) {
    const caseRecord = await this.casesService.findOne(caseId);
    this.casesService.assertAccess(caseRecord, userId, getSessionTokenFromReq(req));
  }

  @Post(':docId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    await this.assertAccess(caseId, userId, req);
    return this.documentsService.uploadFile(caseId, docId, file);
  }

  @Get(':docId/files')
  async getFiles(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    await this.assertAccess(caseId, userId, req);
    return this.documentsService.getFiles(caseId, docId);
  }

  @Get(':docId/files/:fileId/url')
  async getFileUrl(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    await this.assertAccess(caseId, userId, req);
    return this.documentsService.getFileUrl(caseId, docId, fileId);
  }

  @Post()
  async addCustomDocument(
    @Param('caseId') caseId: string,
    @Body('label') label: string,
    @Body('category') category: 'foreigner' | 'company',
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    await this.assertAccess(caseId, userId, req);
    return this.documentsService.addCustomDocument(caseId, label, category);
  }
}
