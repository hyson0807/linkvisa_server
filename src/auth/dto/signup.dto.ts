import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';

export class SignupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @Match('password', { message: '비밀번호가 일치하지 않습니다' })
  passwordConfirm: string;
}
