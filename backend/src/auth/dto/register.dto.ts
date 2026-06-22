import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  nom!: string;

  @IsString()
  @Matches(/^@?[a-zA-Z0-9_.]{3,30}$/, { message: "Nom d'utilisateur invalide" })
  username!: string;

  @IsString()
  @Matches(/^\+?[0-9\s]{6,20}$/, { message: 'Numéro de téléphone invalide' })
  phone!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  motDePasse!: string;
}
