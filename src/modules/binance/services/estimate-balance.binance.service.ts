/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { BinanceConfig } from 'src/configs/services/binance.config';
import * as crypto from 'crypto';
import { Spot } from '@binance/connector';

@Injectable()
export class EstimateBalanceBinanceService {
  private readonly logger = new Logger(EstimateBalanceBinanceService.name);

  private readonly binance_api_key: string;

  private readonly binance_secret_key: string;

  private readonly binance_base_url: string = 'https://api.binance.com';

  private client: Spot;

  constructor(
    private readonly httpService: HttpService,
    private readonly binanceConfig: BinanceConfig,
  ) {
    this.binance_api_key = binanceConfig.api_key;
    this.binance_secret_key = binanceConfig.secret_key;

    const client = new Spot(
      this.binanceConfig.api_key,
      this.binanceConfig.secret_key,
      {
        baseURL: 'https://api.binance.com',
      },
    );
    this.client = client;
  }

  private generateSignature(params: Record<string, any>): string {
    // 1. Сортировка ключей по алфавиту (ВАЖНО!)
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (obj, key) => {
          obj[key] = params[key];
          return obj;
        },
        {} as Record<string, any>,
      );

    // 2. Формирование query string
    const queryString = Object.entries(sortedParams)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    console.log(queryString, 'query string');

    // 3. Генерация подписи
    const signature = crypto
      .createHmac('sha256', this.binance_secret_key)
      .update(queryString)
      .digest('hex');

    return signature;
  }

  async getSimpleEarn() {
    try {
      const timestamp = Date.now();
      const baseParams = {
        timestamp,
      };

      // Flexible Earn позициялары
      const flexibleParams = { ...baseParams };
      const flexibleSignature = this.generateSignature(flexibleParams);

      const flexible = await this.httpService.axiosRef.get(
        'https://api.binance.com/sapi/v1/simple-earn/flexible/position',
        {
          headers: { 'X-MBX-APIKEY': this.binance_api_key },
          params: { ...flexibleParams, signature: flexibleSignature },
        },
      );

      // Locked Earn позициялары
      const lockedParams = { ...baseParams };
      const lockedSignature = this.generateSignature(lockedParams);

      const locked = await this.httpService.axiosRef.get(
        'https://api.binance.com/sapi/v1/simple-earn/locked/position',
        {
          headers: { 'X-MBX-APIKEY': this.binance_api_key },
          params: { ...lockedParams, signature: lockedSignature },
        },
      );

      // USDT суммасын эсептөө
      let flexibleUSDT = 0;
      let flexibleAssets: any[] = [];

      if (flexible.data?.rows && Array.isArray(flexible.data.rows)) {
        flexibleUSDT = flexible.data.rows
          .filter((r: any) => r.asset === 'USDT')
          .reduce((sum: number, r: any) => sum + parseFloat(r.totalAmount), 0);

        flexibleAssets = flexible.data.rows
          .filter((r: any) => parseFloat(r.totalAmount) > 0)
          .map((r: any) => ({
            asset: r.asset,
            amount: parseFloat(r.totalAmount),
            type: 'flexible',
          }));
      }

      let lockedUSDT = 0;
      let lockedAssets: any[] = [];

      if (locked.data?.rows && Array.isArray(locked.data.rows)) {
        lockedUSDT = locked.data.rows
          .filter((r: any) => r.asset === 'USDT')
          .reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0);

        lockedAssets = locked.data.rows
          .filter((r: any) => parseFloat(r.amount) > 0)
          .map((r: any) => ({
            asset: r.asset,
            amount: parseFloat(r.amount),
            type: 'locked',
          }));
      }

      const earnUsdt = flexibleUSDT + lockedUSDT;
      const earnTotal =
        (flexible.data?.rows?.length || 0) + (locked.data?.rows?.length || 0);
      const earnAssets = [...flexibleAssets, ...lockedAssets];

      return {
        earnAssets,
        earnTotal,
        earnUsdt,
      };
    } catch (e) {
      console.log(e.response.data, 'simple earn error');

      console.log('Earn error:', e.response?.data || e.message);
      this.logger.error('Earn error:', e.message);
      return e?.response?.data;
    }
  }

  async getMargin() {
    try {
      const timestamp = Date.now();
      const params = {
        timestamp,
        // recvWindow: 60000,
      };
      const signature = this.generateSignature(params);

      const margin = await this.httpService.axiosRef.get(
        'https://api.binance.com/sapi/v1/margin/account',
        {
          headers: { 'X-MBX-APIKEY': this.binance_api_key },
          params: { ...params, signature },
        },
      );

      if (margin.data?.userAssets && Array.isArray(margin.data.userAssets)) {
        const marginUSDT = margin.data.userAssets.find(
          (a: any) => a.asset === 'USDT',
        );
        const marginUsdt = marginUSDT
          ? parseFloat(marginUSDT.free) + parseFloat(marginUSDT.locked)
          : 0;
        const marginTotal = margin.data.userAssets.length;
        const marginAsset = margin.data.userAssets
          .filter(
            (a: any) => parseFloat(a.free) > 0 || parseFloat(a.locked) > 0,
          )
          .map((a: any) => ({
            asset: a.asset,
            free: parseFloat(a.free),
            locked: parseFloat(a.locked),
          }));

        return {
          marginUsdt,
          marginAsset,
          marginTotal,
        };
      }
    } catch (e) {
      console.log('Margin error:', e.response?.data || e.message);
      this.logger.error('Margin error:', e.message);
      return e.response?.data;
    }
  }

  async getFuture() {
    try {
      const timestamp = Date.now();
      const params = {
        timestamp,
        // recvWindow: 60000,
      };
      const signature = this.generateSignature(params);

      // Используем v3 эндпоинт
      const futures = await this.httpService.axiosRef.get(
        'https://fapi.binance.com/fapi/v3/account',
        {
          headers: { 'X-MBX-APIKEY': this.binance_api_key },
          params: { ...params, signature },
        },
      );

      if (futures.data) {
        const futuresUSDT = futures.data.assets?.find(
          (a: any) => a.asset === 'USDT',
        );
        const futureUsdt = futuresUSDT
          ? parseFloat(futuresUSDT.walletBalance)
          : parseFloat(futures.data.totalWalletBalance || 0);
        const futureTotal = futures.data.assets?.length || 0;
        const futureAsset =
          futures.data.assets?.map((a: any) => ({
            asset: a.asset,
            walletBalance: parseFloat(a.walletBalance),
            availableBalance: parseFloat(a.availableBalance),
          })) || [];

        return {
          futureAsset,
          futureTotal,
          futureUsdt,
        };
      }

      return null;
    } catch (e) {
      console.log('Futures error:', e.response?.data || e.message);
      this.logger.error('Futures error:', e.message);
      return e.response?.data;
    }
  }

  async getAccountSpot() {
    try {
      const spot = await this.client.account();
      const spotBalances = spot.data.balances;
      const spotUSDT = spotBalances.find((b: any) => b.asset === 'USDT');
      const spotUsdt = spotUSDT
        ? parseFloat(spotUSDT.free) + parseFloat(spotUSDT.locked)
        : 0;
      const spotTotal = spotBalances.filter(
        (b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
      ).length;
      const spotAssets = spotBalances
        .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
        .map((b: any) => ({
          asset: b.asset,
          free: parseFloat(b.free),
          locked: parseFloat(b.locked),
        }));

      return {
        spotUsdt,
        spotTotal,
        spotAssets,
      };
    } catch (e) {
      console.log('Spot error:', e.response?.data || e.message);
      this.logger.error('Spot error:', e.message);
    }
  }

  async getFundingAsset() {
    try {
      const timestamp = Date.now();
      const params = {
        timestamp,
        // recvWindow: 60000,
      };
      const signature = this.generateSignature(params);

      const queryString = Object.keys(params)
        .map((key) => `${key}=${params[key]}&signature=${signature}`)
        .join('');

      // Используем правильный эндпоинт для funding wallet
      const funding = await this.httpService.axiosRef.post(
        'https://api.binance.com/sapi/v1/asset/get-funding-asset',
        queryString,
        {
          headers: {
            'X-MBX-APIKEY': this.binance_api_key,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      if (funding.data && Array.isArray(funding.data)) {
        const fundingUSDT = funding.data.find((f: any) => f.asset === 'USDT');
        const fundingUsdt = fundingUSDT ? parseFloat(fundingUSDT.free) : 0;
        const fundingTotal = funding.data.filter(
          (f: any) => parseFloat(f.free) > 0,
        ).length;
        const fundingAssets = funding.data
          .filter((f: any) => parseFloat(f.free) > 0)
          .map((f: any) => ({
            asset: f.asset,
            free: parseFloat(f.free),
            locked: 0,
          }));

        return {
          fundingUSDT,
          fundingUsdt,
          fundingTotal,
          fundingAssets,
        };
      }

      return null;
    } catch (e) {
      console.log('Funding error:', e.response?.data || e.message);
      this.logger.error('Funding error:', e.message);

      return e.response.data;
    }
  }

  async estimatedBalance() {
    const results = {
      spot: { usdt: 0, total: 0, assets: [] as any[] },
      funding: { usdt: 0, total: 0, assets: [] as any[] },
      earn: { usdt: 0, total: 0, assets: [] as any[] },
      staking: { usdt: 0, total: 0, assets: [] as any[] },
      margin: { usdt: 0, total: 0, assets: [] as any[] },
      futures: { usdt: 0, total: 0, assets: [] as any[] },
      p2p: { usdt: 0, total: 0, assets: [] as any[] },
      totalUSDT: 0,
      timestamp: new Date().toISOString(),
    };

    //________________EARN____________________________
    const simpleEarn = await this.getSimpleEarn();

    results.earn.assets = simpleEarn.earnAssets;
    results.earn.total = simpleEarn.earnTotal;
    results.earn.usdt = simpleEarn.earnUsdt;
    //____________________________________________

    //________________MARGIN____________________________
    const margin = await this.getMargin();

    results.margin.assets = margin.marginAsset;
    results.margin.total = margin.marginTotal;
    results.margin.usdt = margin.marginUsdt;
    //____________________________________________

    //________________FUTURE____________________________
    const future = await this.getFuture();

    results.futures.assets = future.futureAsset;
    results.futures.total = future.futureTotal;
    results.futures.usdt = future.futureUsdt;
    //____________________________________________

    //________________FUNDING ASSETS____________________________
    const fundingAssets = await this.getFundingAsset();

    results.funding.assets = fundingAssets.fundingAssets;
    results.funding.total = fundingAssets.fundingTotal;
    results.funding.usdt = fundingAssets.fundingUsdt;
    //____________________________________________

    //________________ACCOUNT SPOT____________________________
    const accountSpot = await this.getAccountSpot();

    results.spot.assets = accountSpot?.spotAssets;
    results.spot.total = accountSpot?.spotTotal;
    results.spot.usdt = accountSpot?.spotUsdt || 0;
    //____________________________________________

    results.totalUSDT =
      results.spot.usdt +
      results.funding.usdt +
      results.earn.usdt +
      results.staking.usdt +
      results.margin.usdt +
      results.futures.usdt +
      results.p2p.usdt;

    return results;
  }
}
