/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { BinanceService } from './binance.service';
import { DepositsQuery } from './dto/deposits-query.dto';
import { GetSuccessDepositQueryDto } from './dto/get-success-deposit-query.dto';
import { getUsdtReceivedDto } from './dto/get-usdt-received.dto';
import { GetOrderHistoryQueryDto } from './dto/get-order-history.dto';

@Controller('binance')
export class BinanceController {
  constructor(private readonly binanceService: BinanceService) {}

  @Get('get-balance-usdt')
  getBalaceUsdt() {
    return this.binanceService.getUSDTBalance();
  }

  @Get('balance/all-products')
  async getAllBalances() {
    return this.binanceService.getAllBalancesAcrossProducts();
  }

  @Get('account')
  account() {
    return this.binanceService.account();
  }

  @Get('order')
  order() {
    return this.binanceService.order();
  }

  @Get('allOrders')
  allOrders(@Query() query: GetOrderHistoryQueryDto) {
    return this.binanceService.allOrders(query);
  }

  @Get('check-ip')
  async checkMyIP() {
    return this.binanceService.checkMyIP();
  }

  @Get('ton-to-usdt')
  async getTONtoUSDTPrice() {
    return this.binanceService.getTONtoUSDTPrice();
  }

  @Get('estimated-balance')
  async getEstimatedBalanceInUSDT() {
    return this.binanceService.getEstimatedBalanceInUSDT();
  }

  @Get('get-balance-history')
  getBalaceHistory() {
    return this.binanceService.getDepositHistory();
  }

  @Get('check-all-deposits')
  checkAllDeposits() {
    return this.binanceService.checkAllDeposit();
  }

  @Get('deposits')
  getDeposits(@Query() query: DepositsQuery) {
    return this.binanceService.getDeposits(query);
  }

  @Get('order-history')
  getOrderHistory(@Query() query: GetOrderHistoryQueryDto) {
    return this.binanceService.getOrderHistory(query);
  }

  /**
   * Получить только USDT пополнения (то, что вам нужно!)
   * GET /binance/deposits/usdt?limit=50
   */
  @Get('deposits/usdt')
  async getUSDTDeposits(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.binanceService.getUSDTDeposits(limitNum);
  }

  /**
   * Получить успешные пополнения
   * GET /binance/deposits/successful?coin=USDT
   */
  @Get('deposits/successful')
  async getSuccessfulDeposits(@Query() query: GetSuccessDepositQueryDto) {
    return this.binanceService.getSuccessfulDeposits(query);
  }

  /**
   * Получить общую сумму полученных USDT
   * GET /binance/deposits/usdt/total?days=30
   */
  @Get('deposits/usdt/total')
  getTotalUSDTReceived(@Query() query: getUsdtReceivedDto) {
    return this.binanceService.getTotalUSDTReceived(query);
  }

  /**
   * Получить пополнения за последние 24 часа
   * GET /binance/deposits/today
   */
  @Get('deposits/today')
  async getTodayDeposits() {
    return this.binanceService.getRecentDeposits();
  }

  // ============ ВЫВОДЫ (НОВЫЕ МЕТОДЫ) ============
  @Get('withdraws')
  getWithdraws(@Query() query: DepositsQuery) {
    return this.binanceService.getWithdraws(query);
  }

  @Get('withdraws/usdt')
  getUSDTWithdraws(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 50;
    return this.binanceService.getUSDTWithdraws(limitNum);
  }

  @Get('withdraws/successful')
  async getSuccessfulWithdraws(@Query() query: GetSuccessDepositQueryDto) {
    return this.binanceService.getSuccessfulWithdraws(query);
  }

  @Get('withdraws/pending')
  getPendingWithdraws(@Query() query: GetSuccessDepositQueryDto) {
    return this.binanceService.getPendingWithdraws(query);
  }

  @Get('withdraws/total-usdt')
  async getTotalUSDTWithdrawn(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : undefined;
    return this.binanceService.getTotalUSDTWithdrawn(daysNum);
  }

  @Get('withdraws/check/id/:id')
  async checkWithdrawById(@Param('id') id: string) {
    return this.binanceService.checkWithdrawById(id);
  }

  @Get('withdraws/check/tx/:txId')
  async checkWithdrawByTxId(@Param('txId') txId: string) {
    return this.binanceService.checkWithdrawByTxId(txId);
  }

  @Get('stats')
  async getStats(@Query('days') days?: string) {
    return this.binanceService.getStats(days);
  }
}
