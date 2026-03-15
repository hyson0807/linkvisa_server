import { IsString, IsOptional, IsObject } from 'class-validator';

export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  foreignerName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsObject()
  manualFields?: Record<string, string>;
}
