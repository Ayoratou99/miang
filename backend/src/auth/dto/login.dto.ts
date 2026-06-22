import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(1)
  identifiant!: string; // username or phone

  @IsString()
  @MinLength(1)
  motDePasse!: string;
}
