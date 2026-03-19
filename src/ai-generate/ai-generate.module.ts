import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { AiGenerateController } from './ai-generate.controller';
import { AiGenerateService } from './ai-generate.service';

@Module({
  imports: [PrismaModule, CasesModule],
  controllers: [AiGenerateController],
  providers: [AiGenerateService],
})
export class AiGenerateModule {}
