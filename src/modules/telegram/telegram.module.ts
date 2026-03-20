import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConfigsModule } from 'src/configs/configs.module';
import { ReplenishScene } from './scenes/replenish';
import { BinanceModule } from '../binance/binance.module';

@Module({
  imports: [ConfigsModule, BinanceModule],
  controllers: [],
  providers: [TelegramService, ReplenishScene],
  exports: [TelegramService],
})
export class TelegramModule {}
