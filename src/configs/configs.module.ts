import { Module } from '@nestjs/common';
import { ConfigsService } from './configs.service';
import { ConfigModule } from '@nestjs/config';
import { AppConfig } from './services/app.config';
import { BinanceConfig } from './services/binance.config';

@Module({
  imports: [ConfigModule.forRoot({})],
  controllers: [],
  providers: [ConfigsService, AppConfig, BinanceConfig],
  exports: [ConfigsService, AppConfig, BinanceConfig],
})
export class ConfigsModule {}
