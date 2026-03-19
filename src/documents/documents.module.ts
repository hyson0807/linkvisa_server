import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { CasesModule } from '../cases/cases.module';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    CasesModule,
    OcrModule,
    MulterModule.register({ storage: undefined }), // memory storage
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
