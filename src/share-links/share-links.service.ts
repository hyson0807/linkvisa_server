import { Injectable, NotFoundException, GoneException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { CasesService } from '../cases/cases.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';

@Injectable()
export class ShareLinksService {
  constructor(
    private prisma: PrismaService,
    private documentsService: DocumentsService,
    private casesService: CasesService,
  ) {}

  async create(
    userId: string | null,
    sessionToken: string | null,
    dto: CreateShareLinkDto,
  ) {
    // Verify case access (owner or session token)
    const caseRecord = await this.casesService.findOne(dto.caseId);
    this.casesService.assertAccess(caseRecord, userId, sessionToken);

    // Check for existing active link with same case + provider
    const existing = await this.prisma.shareLink.findFirst({
      where: {
        caseId: dto.caseId,
        type: dto.providerId,
        isActive: true,
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      return {
        token: existing.token,
        expiresAt: existing.expiresAt.toISOString(),
        isActive: existing.isActive,
      };
    }

    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const shareLink = await this.prisma.shareLink.create({
      data: {
        caseId: dto.caseId,
        type: dto.providerId,
        expiresAt,
      },
    });

    return {
      token: shareLink.token,
      expiresAt: shareLink.expiresAt.toISOString(),
      isActive: shareLink.isActive,
    };
  }

  private async resolveShareLink(token: string) {
    const shareLink = await this.prisma.shareLink.findUnique({
      where: { token },
    });

    if (!shareLink) {
      throw new NotFoundException('유효하지 않은 링크입니다');
    }

    if (!shareLink.isActive || shareLink.expiresAt < new Date()) {
      throw new GoneException('링크가 만료되었습니다');
    }

    return shareLink;
  }

  async getInfo(token: string) {
    const shareLink = await this.resolveShareLink(token);

    const caseRecord = await this.prisma.case.findUnique({
      where: { id: shareLink.caseId },
      include: { documents: { include: { files: true } } },
    });

    if (!caseRecord) {
      throw new NotFoundException('케이스를 찾을 수 없습니다');
    }

    return {
      providerId: shareLink.type,
      foreignerName: caseRecord.foreignerName,
      visaType: caseRecord.visaType,
      documents: caseRecord.documents.map((doc) => ({
        id: doc.id,
        typeId: doc.typeId,
        status: doc.status,
        customLabel: doc.customLabel,
        isCustom: doc.isCustom,
        customCategory: doc.customCategory,
        files: doc.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
        })),
      })),
    };
  }

  async uploadViaToken(
    token: string,
    docId: string,
    file: Express.Multer.File,
  ) {
    const shareLink = await this.resolveShareLink(token);

    // Verify the document belongs to this case with a lightweight query
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id: docId, caseId: shareLink.caseId },
    });
    if (!doc) {
      throw new NotFoundException('서류를 찾을 수 없습니다');
    }

    return this.documentsService.uploadFile(shareLink.caseId, docId, file);
  }

  async deactivate(userId: string, token: string) {
    const shareLink = await this.prisma.shareLink.findUnique({
      where: { token },
      include: { case: true },
    });

    if (!shareLink || shareLink.case.ownerId !== userId) {
      throw new NotFoundException('링크를 찾을 수 없습니다');
    }

    await this.prisma.shareLink.update({
      where: { token },
      data: { isActive: false },
    });
  }
}
