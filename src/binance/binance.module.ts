import { Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { BinanceController } from './binance.controller';
import { HttpModule } from '@nestjs/axios';
import { ReplenishBinanceService } from './services/replenish.binance.service';
import { WithdrawBinanceService } from './services/withdraw.binance.service';
import { ConfigsModule } from 'src/configs/configs.module';

@Module({
  imports: [HttpModule, ConfigsModule],
  controllers: [BinanceController],
  providers: [BinanceService, ReplenishBinanceService, WithdrawBinanceService],
  exports: [BinanceService],
})
export class BinanceModule {}
