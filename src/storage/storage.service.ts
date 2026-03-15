import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    this.bucket = configService.get('R2_BUCKET_NAME', 'linkvisa-documents');
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: configService.get('R2_ENDPOINT'),
      credentials: {
        accessKeyId: configService.get('R2_ACCESS_KEY_ID', ''),
        secretAccessKey: configService.get('R2_SECRET_ACCESS_KEY', ''),
      },
    });
  }

  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async getSignedDownloadUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }
}
