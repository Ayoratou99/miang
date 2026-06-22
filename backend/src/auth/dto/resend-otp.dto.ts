import { IsString, Matches } from 'class-validator';

export class ResendOtpDto {
  @IsString()
  @Matches(/^\+?[0-9\s]{6,20}$/)
  phone!: string;
}
