import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class MovementDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  montant!: number;

  @IsIn(['airtel', 'moov'])
  operateur!: 'airtel' | 'moov';

  @IsOptional()
  @IsString()
  phone?: string;
}

export class WebhookDto {
  @IsString()
  idempotencyKey!: string;

  @IsIn(['success', 'failed'])
  status!: 'success' | 'failed';
}
