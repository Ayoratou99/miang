import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PERMISSIONS } from '../common/constants';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CreateSessionDto, StakeDto } from './dto/session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.sessions.list(userId);
  }

  @Post()
  @RequirePermission(PERMISSIONS.SESSION_CREATE)
  create(@CurrentUser('id') userId: string, @Body() dto: CreateSessionDto) {
    return this.sessions.create(userId, dto);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessions.get(id, userId);
  }

  @Post(':id/stake')
  stake(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: StakeDto) {
    return this.sessions.stake(userId, id, dto.montant);
  }
}
