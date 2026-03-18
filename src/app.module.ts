import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinanceModule } from './binance/binance.module';
import { ConfigsModule } from './configs/configs.module';

@Module({
  imports: [BinanceModule, ConfigsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
