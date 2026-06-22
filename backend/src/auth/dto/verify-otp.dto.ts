import { IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?[0-9\s]{6,20}$/)
  phone!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Le code doit comporter 6 chiffres' })
  code!: string;
}
