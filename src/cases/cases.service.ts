import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { getDocumentsForVisa } from './document-registry';

@Injectable()
export class CasesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCaseDto, userId: string | null) {
    const docs = getDocumentsForVisa(dto.visaType);

    return this.prisma.case.create({
      data: {
        ownerId: userId,
        sessionToken: userId ? null : (dto.sessionToken ?? null),
        foreignerName: dto.foreignerName,
        companyName: dto.companyName,
        visaType: dto.visaType,
        visaSubtype: dto.visaSubtype,
        applicationType: dto.applicationType,
        status: 'documents-pending',
        documents: {
          create: docs.map((d) => ({
            typeId: d.id,
            direction: d.direction,
            status: 'pending',
            customLabel: d.label,
            customCategory: d.category,
          })),
        },
      },
      include: { documents: { include: { files: true } } },
    });
  }

  async findAllByOwner(userId: string) {
    return this.prisma.case.findMany({
      where: { ownerId: userId, deletedAt: null },
      include: { documents: { include: { files: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const caseRecord = await this.prisma.case.findUnique({
      where: { id },
      include: { documents: { include: { files: true } } },
    });
    if (!caseRecord || caseRecord.deletedAt) {
      throw new NotFoundException('케이스를 찾을 수 없습니다');
    }
    return caseRecord;
  }

  async update(
    id: string,
    dto: UpdateCaseDto,
    existingManualFields?: Record<string, string>,
  ) {
    const data: Record<string, unknown> = {};
    if (dto.foreignerName !== undefined) data.foreignerName = dto.foreignerName;
    if (dto.companyName !== undefined) data.companyName = dto.companyName;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.manualFields !== undefined) {
      data.manualFields = {
        ...(existingManualFields ?? {}),
        ...dto.manualFields,
      };
    }

    return this.prisma.case.update({
      where: { id },
      data,
      include: { documents: { include: { files: true } } },
    });
  }

  async softDelete(id: string) {
    await this.prisma.case.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async claim(userId: string, sessionToken: string) {
    const result = await this.prisma.case.updateMany({
      where: {
        sessionToken,
        ownerId: null,
        deletedAt: null,
      },
      data: {
        ownerId: userId,
        sessionToken: null,
      },
    });
    return { claimed: result.count };
  }

  assertAccess(
    caseRecord: { ownerId: string | null; sessionToken: string | null },
    userId: string | null,
    sessionToken: string | null,
  ) {
    if (userId && caseRecord.ownerId === userId) return;
    if (
      !userId &&
      sessionToken &&
      caseRecord.sessionToken === sessionToken
    )
      return;
    throw new ForbiddenException('이 케이스에 접근할 수 없습니다');
  }
}
