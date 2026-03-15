import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateShareLinkDto {
  @IsString()
  caseId: string;

  @IsString()
  providerId: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
