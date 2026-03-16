import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { OcrService } from './ocr.service';

@Module({
  imports: [StorageModule],
  providers: [OcrService],
  exports: [OcrService],
})
export class OcrModule {}
