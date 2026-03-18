import {
  Controller,
  Post,
  Param,
  UseGuards,
  Req,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { Request } from 'express';
import { OptionalJwtAccessGuard } from '../common/guards/optional-jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SESSION_TOKEN_HEADER } from '../common/constants';
import { CasesService } from '../cases/cases.service';
import { AiGenerateService } from './ai-generate.service';

function getSessionTokenFromReq(req: Request): string | null {
  return (req.headers[SESSION_TOKEN_HEADER] as string) ?? null;
}

@Controller('cases/:caseId')
@UseGuards(OptionalJwtAccessGuard)
export class AiGenerateController {
  private readonly logger = new Logger(AiGenerateController.name);

  constructor(
    private casesService: CasesService,
    private aiGenerateService: AiGenerateService,
  ) {}

  @Post('generate-reason')
  async generateReason(
    @Param('caseId') caseId: string,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    const caseRecord = await this.casesService.findOne(caseId);
    this.casesService.assertAccess(caseRecord, userId, getSessionTokenFromReq(req));

    try {
      const result = await this.aiGenerateService.generateEmploymentReason(caseRecord);
      return result;
    } catch (error) {
      this.logger.error(`AI generate failed for case ${caseId}:`, error);
      throw new InternalServerErrorException(
        `AI 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
