import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAccessGuard } from '../common/guards/jwt-access.guard';
import { OptionalJwtAccessGuard } from '../common/guards/optional-jwt-access.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { SESSION_TOKEN_HEADER } from '../common/constants';

function getSessionTokenFromReq(req: Request): string | null {
  return (req.headers[SESSION_TOKEN_HEADER] as string) ?? null;
}

@Controller('cases')
export class CasesController {
  constructor(private casesService: CasesService) {}

  @Post()
  @UseGuards(OptionalJwtAccessGuard)
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser('id') userId: string | null,
  ) {
    return this.casesService.create(dto, userId);
  }

  @Get()
  @UseGuards(JwtAccessGuard)
  async findAll(@CurrentUser('id') userId: string) {
    return this.casesService.findAllByOwner(userId);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAccessGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    const caseRecord = await this.casesService.findOne(id);
    this.casesService.assertAccess(caseRecord, userId, getSessionTokenFromReq(req));
    return caseRecord;
  }

  @Patch(':id')
  @UseGuards(OptionalJwtAccessGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    const caseRecord = await this.casesService.findOne(id);
    this.casesService.assertAccess(caseRecord, userId, getSessionTokenFromReq(req));
    return this.casesService.update(
      id,
      dto,
      caseRecord.manualFields as Record<string, string>,
    );
  }

  @Delete(':id')
  @UseGuards(OptionalJwtAccessGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string | null,
    @Req() req: Request,
  ) {
    const caseRecord = await this.casesService.findOne(id);
    this.casesService.assertAccess(caseRecord, userId, getSessionTokenFromReq(req));
    await this.casesService.softDelete(id);
  }

  @Post('claim')
  @UseGuards(JwtAccessGuard)
  async claim(
    @CurrentUser('id') userId: string,
    @Body('sessionToken') sessionToken: string,
  ) {
    return this.casesService.claim(userId, sessionToken);
  }
}
