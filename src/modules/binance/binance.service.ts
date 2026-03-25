/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Spot } from '@binance/connector';
import { ReplenishBinanceService } from './services/replenish.binance.service';
import { WithdrawBinanceService } from './services/withdraw.binance.service';
import { DepositsQuery } from './dto/deposits-query.dto';
import { GetSuccessDepositQueryDto } from './dto/get-success-deposit-query.dto';
import { getUsdtReceivedDto } from './dto/get-usdt-received.dto';
import { BinanceConfig } from 'src/configs/services/binance.config';
import { GetOrderHistoryQueryDto } from './dto/get-order-history.dto';
import { ECrypto } from '../telegram/actions/enums/crypto.enum';
import { WithdrawAnotherUserDto } from './dto/withdraw-another-user.dto';
import { WithdrawFeeDto } from './dto/withdraw-fee.dto';
import { EstimateBalanceBinanceService } from './services/estimate-balance.binance.service';
import { FundingHistoryBinanceService } from './services/funding-history.binance.service';
import { FundingHistoryQueryDto } from './dto/funding-query.dto';

@Injectable()
export class BinanceService implements OnModuleInit {
  private client: Spot;

  constructor(
    private readonly replenishService: ReplenishBinanceService,
    private readonly withdrawService: WithdrawBinanceService,
    private readonly binanceConfig: BinanceConfig,
    private readonly estimateBalanceBinanceService: EstimateBalanceBinanceService,
    private readonly fundingHistoryBinanceService: FundingHistoryBinanceService,
  ) {}

  onModuleInit() {
    const client = new Spot(
      this.binanceConfig.api_key,
      this.binanceConfig.secret_key,
      {
        baseURL: 'https://api.binance.com',
      },
    );
    this.client = client;
  }

  getDeposits(query: DepositsQuery) {
    const { coin, days, limit, status } = query;
    if (days) {
      // Если указаны дни, получаем за последние N дней
      const daysNum = days ? parseInt(days) : 7;
      return this.replenishService.getRecentDeposits(daysNum, coin);
    }

    // Иначе с фильтрацией
    const limitNum = limit ? parseInt(limit) : 50;
    const statusNum = status ? parseInt(status) : undefined;

    return this.replenishService.getDepositHistory({
      coin,
      status: statusNum,
      limit: limitNum,
    });
  }

  getFundingHistory(fundingHistoryQueryDto: FundingHistoryQueryDto) {
    return this.fundingHistoryBinanceService.getFundingHistory(
      fundingHistoryQueryDto,
    );
  }

  getSimpleEarn() {
    return this.estimateBalanceBinanceService.getSimpleEarn();
  }

  getMargin() {
    return this.estimateBalanceBinanceService.getMargin();
  }

  getFuture() {
    return this.estimateBalanceBinanceService.getFuture();
  }

  getAccountSpot() {
    return this.estimateBalanceBinanceService.getAccountSpot();
  }

  getFundingAsset() {
    return this.estimateBalanceBinanceService.getFundingAsset();
  }

  estimatedBalance() {
    return this.estimateBalanceBinanceService.estimatedBalance();
  }

  withdrawToAnotherUser(withdrawAnotherUserDto: WithdrawAnotherUserDto) {
    return this.replenishService.withdrawToAnotherUser(withdrawAnotherUserDto);
  }

  getWithdrawFee(withdrawFeeDto: WithdrawFeeDto) {
    return this.replenishService.getWithdrawFee(withdrawFeeDto);
  }

  getOrderHistory(query: GetOrderHistoryQueryDto) {
    return this.replenishService.getOrderHistory(query);
  }

  account() {
    return this.replenishService.account();
  }

  order() {
    return this.replenishService.order();
  }

  allOrders(params?: GetOrderHistoryQueryDto) {
    return this.replenishService.allOrders(params);
  }

  getTONtoUSDTPrice() {
    return this.replenishService.getTONtoUSDTPrice();
  }

  getCryptoPrice(crypto: ECrypto) {
    return this.replenishService.getCryptoPrice(crypto);
  }

  getAllBalancesAcrossProducts() {
    return this.replenishService.getAllBalancesAcrossProducts();
  }

  getEstimatedBalanceInUSDT() {
    return this.replenishService.getEstimatedBalanceInUSDT();
  }

  getUSDTBalance() {
    return this.replenishService.getUSDTBalance(this.client);
  }

  checkMyIP() {
    return this.replenishService.checkMyIP();
  }

  getDepositHistory() {
    return this.replenishService.getDepositHistory();
  }

  getRecentDeposits() {
    return this.replenishService.getRecentDeposits();
  }

  getUSDTDeposits(limit?: number) {
    return this.replenishService.getUSDTDeposits(limit);
  }

  checkAllDeposit() {
    return this.replenishService.checkAllDeposits();
  }

  getSuccessfulDeposits(query: GetSuccessDepositQueryDto) {
    const { coin, limit } = query;

    const limitNum = limit ? parseInt(limit) : 50;
    return this.replenishService.getSuccessfulDeposits(coin, limitNum);
  }

  getTotalUSDTReceived(query: getUsdtReceivedDto) {
    const { days } = query;
    const daysNum = days ? parseInt(days) : undefined;
    return this.replenishService.getTotalUSDTReceived(daysNum);
  }

  getWithdraws(query: DepositsQuery) {
    const { coin, days, limit, status } = query;

    if (days) {
      const daysNum = days ? parseInt(days) : 7;
      return this.withdrawService.getRecentWithdraws(daysNum, coin);
    }

    const limitNum = limit ? parseInt(limit) : 50;
    const statusNum = status ? parseInt(status) : undefined;

    return this.withdrawService.getWithdrawHistory({
      coin,
      status: statusNum,
      limit: limitNum,
    });
  }

  getUSDTWithdraws(limit: number) {
    return this.withdrawService.getUSDTWithdraws(limit);
  }

  getSuccessfulWithdraws(query: GetSuccessDepositQueryDto) {
    const { coin, limit } = query;

    const limitNum = limit ? parseInt(limit) : 50;
    return this.withdrawService.getSuccessfulWithdraws(coin, limitNum);
  }

  getPendingWithdraws(query: GetSuccessDepositQueryDto) {
    const { coin, limit } = query;

    const limitNum = limit ? parseInt(limit) : 50;

    return this.withdrawService.getPendingWithdraws(coin, limitNum);
  }

  getTotalUSDTWithdrawn(days?: number) {
    return this.withdrawService.getTotalUSDTWithdrawn(days);
  }

  checkWithdrawById(id: string) {
    return this.withdrawService.checkWithdrawById(id);
  }

  checkWithdrawByTxId(txId: string) {
    return this.withdrawService.checkWithdrawByTxId(txId);
  }

  async getStats(days?: string) {
    const daysNum = days ? parseInt(days) : 30;

    const [deposits, withdraws] = await Promise.all([
      this.replenishService.getRecentDeposits(daysNum, 'USDT'),
      this.withdrawService.getRecentWithdraws(daysNum, 'USDT'),
    ]);

    const totalDeposited = deposits
      .filter((d) => d.statusCode === 1)
      .reduce((sum, d) => sum + d.amount, 0);

    const totalWithdrawn = withdraws
      .filter((w) => w.statusCode === 6)
      .reduce((sum, w) => sum + w.amount, 0);

    return {
      period: `${daysNum} дней`,
      deposits: {
        count: deposits.filter((d) => d.statusCode === 1).length,
        total: totalDeposited,
        list: deposits.slice(0, 5), // последние 5
      },
      withdraws: {
        count: withdraws.filter((w) => w.statusCode === 6).length,
        total: totalWithdrawn,
        list: withdraws.slice(0, 5), // последние 5
      },
      netFlow: totalDeposited - totalWithdrawn,
    };
  }
}
