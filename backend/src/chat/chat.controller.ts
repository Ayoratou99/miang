import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SendMessageDto } from './dto/send-message.dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get('conversations')
  list(@CurrentUser('id') userId: string) {
    return this.chat.list(userId);
  }

  @Get('conversations/:id/messages')
  messages(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chat.messages(id, userId);
  }

  @Post('conversations/:id/messages')
  send(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chat.send(id, userId, dto.corps);
  }

  @Post('conversations/:id/read')
  read(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.chat.markRead(id, userId);
  }
}
