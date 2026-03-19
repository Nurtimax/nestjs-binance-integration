import { Module } from '@nestjs/common';
import { ConfigsService } from './configs.service';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './services/app.config';
import { BinanceConfig } from './services/binance.config';
import { TelegramConfig } from './services/telegram.config';

@Module({
  imports: [ConfigModule.forRoot({})],
  controllers: [],
  providers: [ConfigsService, AppConfig, BinanceConfig, TelegramConfig],
  exports: [ConfigsService, AppConfig, BinanceConfig, TelegramConfig],
})
export class ConfigsModule {}
