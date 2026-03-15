import { IsString, IsOptional } from 'class-validator';

export class CreateCaseDto {
  @IsString()
  foreignerName: string;

  @IsString()
  companyName: string;

  @IsString()
  visaType: string;

  @IsOptional()
  @IsString()
  visaSubtype?: string;

  @IsOptional()
  @IsString()
  applicationType?: string;

  @IsOptional()
  @IsString()
  sessionToken?: string;
}
