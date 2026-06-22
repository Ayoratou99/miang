import { Type } from 'class-transformer';
import { IsInt, IsPositive, IsString, Min, MinLength, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  titre!: string;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  miseMin!: number;
}

export class StakeDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  montant!: number;
}
