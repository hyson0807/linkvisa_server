import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksService } from './share-links.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { CasesModule } from '../cases/cases.module';

@Module({
  imports: [
    PrismaModule,
    DocumentsModule,
    CasesModule,
    MulterModule.register({ storage: undefined }),
  ],
  controllers: [ShareLinksController],
  providers: [ShareLinksService],
})
export class ShareLinksModule {}
