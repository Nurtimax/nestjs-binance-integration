import { Injectable } from '@nestjs/common';
import { ConfigsService } from '../configs.service';

@Injectable()
export class TelegramConfig {
  bot_token: string;
  constructor(private readonly configService: ConfigsService) {
    this.bot_token = configService.getString('TELEGRAM_BOT_TOKEN');
  }
}
