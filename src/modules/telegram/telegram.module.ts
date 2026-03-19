import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConfigsModule } from 'src/configs/configs.module';

@Module({
  imports: [ConfigsModule],
  controllers: [],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
