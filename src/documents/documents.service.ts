import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { OcrService } from '../ocr/ocr.service';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

/** Expected OCR field names per document type — keeps Gemini output keys stable */
const OCR_FIELD_HINTS: Record<string, string[]> = {
  passport: ['성명(영문)', '성별', '생년월일', '국적', '여권번호', '여권만료일'],
  alien_registration: ['성명', '외국인등록번호', '체류자격', '체류기간'],
  diploma: ['성명', '학교명', '학위', '전공', '졸업일자'],
  graduation_cert: ['성명', '학교명', '학위', '전공', '졸업일자'],
  business_reg: ['상호', '대표자', '사업자등록번호', '사업장소재지', '업태', '종목'],
  employment_contract: ['성명', '근무처', '직위', '근무내용', '계약기간', '급여'],
};

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private ocrService: OcrService,
  ) {}

  private async findDocOrFail(
    caseId: string,
    docId: string,
    include?: { files: boolean },
  ) {
    const doc = await this.prisma.caseDocument.findFirst({
      where: { id: docId, caseId },
      ...(include && { include }),
    });
    if (!doc) throw new NotFoundException('서류를 찾을 수 없습니다');
    return doc;
  }

  async uploadFile(
    caseId: string,
    docId: string,
    file: Express.Multer.File,
  ) {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('파일 크기는 20MB를 초과할 수 없습니다');
    }

    const [doc, lastFile] = await Promise.all([
      this.findDocOrFail(caseId, docId),
      this.prisma.documentFile.findFirst({
        where: { documentId: docId },
        orderBy: { version: 'desc' },
      }),
    ]);

    const version = (lastFile?.version ?? 0) + 1;
    // Multer decodes originalname as Latin-1; re-decode as UTF-8 to preserve Korean filenames
    const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const storagePath = `cases/${caseId}/${docId}/${version}/${fileName}`;
    await this.storage.upload(file.buffer, storagePath, file.mimetype);

    const [fileRecord] = await Promise.all([
      this.prisma.documentFile.create({
        data: {
          documentId: docId,
          fileName,
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
    await this.findDocOrFail(caseId, docId);
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

  async deleteFile(caseId: string, docId: string, fileId: string) {
    await this.findDocOrFail(caseId, docId);
    const file = await this.prisma.documentFile.findFirst({
      where: { id: fileId, documentId: docId },
    });
    if (!file) throw new NotFoundException('파일을 찾을 수 없습니다');

    await this.storage.delete(file.storagePath).catch(() => {});
    await this.prisma.documentFile.delete({ where: { id: fileId } });

    // If no files remain, reset document status to pending
    const remaining = await this.prisma.documentFile.count({
      where: { documentId: docId },
    });
    if (remaining === 0) {
      await this.prisma.caseDocument.update({
        where: { id: docId },
        data: { status: 'pending' },
      });
    }
  }

  async deleteDocument(caseId: string, docId: string) {
    const doc = await this.findDocOrFail(caseId, docId, { files: true });

    // Delete files from storage (parallel, best-effort)
    const files = (doc as typeof doc & { files: { storagePath: string }[] }).files;
    await Promise.all(
      files.map((f) => this.storage.delete(f.storagePath).catch(() => {})),
    );

    await this.prisma.caseDocument.delete({ where: { id: docId } });
  }

  async updateDocument(
    caseId: string,
    docId: string,
    data: { label?: string },
  ) {
    await this.findDocOrFail(caseId, docId);
    return this.prisma.caseDocument.update({
      where: { id: docId },
      data: {
        ...(data.label !== undefined && { customLabel: data.label }),
      },
      include: { files: true },
    });
  }

  async runOcr(
    caseId: string,
    docId: string,
  ): Promise<Record<string, string>> {
    const [doc, file] = await Promise.all([
      this.findDocOrFail(caseId, docId),
      this.prisma.documentFile.findFirst({
        where: { documentId: docId },
        orderBy: { version: 'desc' },
      }),
    ]);
    if (!file) throw new NotFoundException('업로드된 파일이 없습니다');

    const result = await this.ocrService.processDocument(
      file.storagePath,
      file.mimeType,
      OCR_FIELD_HINTS[doc.typeId],
    );

    // Save OCR result and update status
    await this.prisma.caseDocument.update({
      where: { id: docId },
      data: {
        ocrResult: result,
        status: 'ocr-complete',
      },
    });

    return result;
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
