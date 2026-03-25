import { Module } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { BinanceController } from './binance.controller';
import { HttpModule } from '@nestjs/axios';
import { ReplenishBinanceService } from './services/replenish.binance.service';
import { WithdrawBinanceService } from './services/withdraw.binance.service';
import { ConfigsModule } from 'src/configs/configs.module';
import { EstimateBalanceBinanceService } from './services/estimate-balance.binance.service';
import { FundingHistoryBinanceService } from './services/funding-history.binance.service';

@Module({
  imports: [HttpModule, ConfigsModule],
  controllers: [BinanceController],
  providers: [
    BinanceService,
    ReplenishBinanceService,
    WithdrawBinanceService,
    EstimateBalanceBinanceService,
    FundingHistoryBinanceService,
  ],
  exports: [BinanceService],
})
export class BinanceModule {}
