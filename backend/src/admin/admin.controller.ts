import { Controller, Get, Param, Post } from '@nestjs/common';
import { PERMISSIONS } from '../common/constants';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('kpis')
  @RequirePermission(PERMISSIONS.ADMIN_ACCESS)
  kpis() {
    return this.admin.kpis();
  }

  @Get('withdrawals/pending')
  @RequirePermission(PERMISSIONS.PAYOUT_APPROVE)
  pending() {
    return this.admin.pendingWithdrawals();
  }

  @Post('withdrawals/:id/approve')
  @RequirePermission(PERMISSIONS.PAYOUT_APPROVE)
  approve(@Param('id') id: string) {
    return this.admin.approveWithdrawal(id);
  }

  @Post('withdrawals/:id/reject')
  @RequirePermission(PERMISSIONS.PAYOUT_APPROVE)
  reject(@Param('id') id: string) {
    return this.admin.rejectWithdrawal(id);
  }
}
