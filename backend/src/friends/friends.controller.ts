import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FriendsService } from './friends.service';

class FriendRequestDto {
  @IsString()
  @MinLength(3)
  username!: string;
}

@Controller('friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Get()
  amis(@CurrentUser('id') userId: string) {
    return this.friends.amis(userId);
  }

  @Get('requests')
  demandes(@CurrentUser('id') userId: string) {
    return this.friends.demandes(userId);
  }

  @Post('request')
  request(@CurrentUser('id') userId: string, @Body() dto: FriendRequestDto) {
    return this.friends.request(userId, dto.username);
  }

  @Post(':id/accept')
  accept(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.friends.accept(userId, id);
  }

  @Post(':id/decline')
  decline(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.friends.decline(userId, id);
  }
}
