import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PERMISSIONS } from '../common/constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { ModerationService } from './moderation.service';

class ReportDto {
  @IsOptional()
  @IsString()
  cibleUserId?: string;

  @IsOptional()
  @IsString()
  cibleMessageId?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  motif!: string;
}

class BanDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Post('report')
  report(@CurrentUser('id') userId: string, @Body() dto: ReportDto) {
    return this.moderation.report(userId, { ...dto, motif: dto.motif });
  }

  @Get('reports')
  @RequirePermission(PERMISSIONS.REPORT_REVIEW)
  reports() {
    return this.moderation.listReports();
  }

  @Post('ban/:userId')
  @RequirePermission(PERMISSIONS.USER_BAN)
  ban(@CurrentUser('id') adminId: string, @Param('userId') userId: string, @Body() dto: BanDto) {
    return this.moderation.ban(adminId, userId, dto.reason ?? 'non précisé');
  }

  @Post('unban/:userId')
  @RequirePermission(PERMISSIONS.USER_BAN)
  unban(@CurrentUser('id') adminId: string, @Param('userId') userId: string) {
    return this.moderation.unban(adminId, userId);
  }
}
