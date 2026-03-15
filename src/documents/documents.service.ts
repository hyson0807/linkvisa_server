import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async uploadFile(
    caseId: string,
    docId: string,
    file: Express.Multer.File,
  ) {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('파일 크기는 20MB를 초과할 수 없습니다');
    }

    const [doc, lastFile] = await Promise.all([
      this.prisma.caseDocument.findFirst({ where: { id: docId, caseId } }),
      this.prisma.documentFile.findFirst({
        where: { documentId: docId },
        orderBy: { version: 'desc' },
      }),
    ]);
    if (!doc) throw new NotFoundException('서류를 찾을 수 없습니다');

    const version = (lastFile?.version ?? 0) + 1;
    const storagePath = `cases/${caseId}/${docId}/${version}/${file.originalname}`;
    await this.storage.upload(file.buffer, storagePath, file.mimetype);

    const [fileRecord] = await Promise.all([
      this.prisma.documentFile.create({
        data: {
          documentId: docId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          storagePath,
          version,
        },
      }),
      this.prisma.caseDocument.update({
        where: { id: docId },
        data: { status: 'uploaded' },
      }),
    ]);

    return fileRecord;
  }

  async getFiles(caseId: string, docId: string) {
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id: docId, caseId },
    });
    if (!doc) throw new NotFoundException('서류를 찾을 수 없습니다');

    return this.prisma.documentFile.findMany({
      where: { documentId: docId },
      orderBy: { version: 'desc' },
    });
  }

  async getFileUrl(caseId: string, docId: string, fileId: string) {
    const file = await this.prisma.documentFile.findFirst({
      where: { id: fileId, documentId: docId },
    });
    if (!file) throw new NotFoundException('파일을 찾을 수 없습니다');

    const url = await this.storage.getSignedDownloadUrl(file.storagePath);
    return { url };
  }

  async addCustomDocument(
    caseId: string,
    label: string,
    category: 'foreigner' | 'company',
  ) {
    const customId = `custom-${Date.now().toString(36)}`;
    return this.prisma.caseDocument.create({
      data: {
        caseId,
        typeId: customId,
        direction: 'input',
        status: 'pending',
        isCustom: true,
        customLabel: label,
        customCategory: category,
      },
    });
  }
}
