import { Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DrawService } from './draw.service';

@Controller('draw')
export class DrawController {
  constructor(private readonly draw: DrawService) {}

  @Get(':sessionId')
  async result(@Param('sessionId') sessionId: string) {
    const result = await this.draw.getResult(sessionId);
    if (!result) {
      throw new NotFoundException('Tirage non encore effectué');
    }
    return result;
  }

  /** Dev/owner affordance — normally the draw fires automatically at midnight. */
  @Post(':sessionId/run')
  run(@CurrentUser('id') userId: string, @Param('sessionId') sessionId: string) {
    return this.draw.manualRun(userId, sessionId);
  }
}
