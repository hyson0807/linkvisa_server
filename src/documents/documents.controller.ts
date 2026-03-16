import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { OptionalJwtAccessGuard } from '../common/guards/optional-jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SESSION_TOKEN_HEADER } from '../common/constants';
import { CasesService } from '../cases/cases.service';
import { DocumentsService } from './documents.service';
import { UpdateDocumentDto } from './dto/update-document.dto';

function getSessionTokenFromReq(req: Request): string | null {
  return (req.headers[SESSION_TOKEN_HEADER] as string) ?? null;
}

@Controller('cases/:caseId/documents')
@UseGuards(OptionalJwtAccessGuard)
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

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

  @Delete(':docId/files/:fileId')
  async deleteFile(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    await this.assertAccess(caseId, userId, req);
    await this.documentsService.deleteFile(caseId, docId, fileId);
  }

  @Delete(':docId')
  async deleteDocument(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    await this.assertAccess(caseId, userId, req);
    await this.documentsService.deleteDocument(caseId, docId);
  }

  @Patch(':docId')
  async updateDocument(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @Body() body: UpdateDocumentDto,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    await this.assertAccess(caseId, userId, req);
    return this.documentsService.updateDocument(caseId, docId, body);
  }

  @Post(':docId/ocr')
  async runOcr(
    @Param('caseId') caseId: string,
    @Param('docId') docId: string,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    await this.assertAccess(caseId, userId, req);
    try {
      const result = await this.documentsService.runOcr(caseId, docId);
      return { result };
    } catch (error) {
      this.logger.error(`OCR failed for doc ${docId}:`, error);
      throw new InternalServerErrorException(
        `OCR 처리 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
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
