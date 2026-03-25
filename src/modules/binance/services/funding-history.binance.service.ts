/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { BinanceConfig } from 'src/configs/services/binance.config';
import * as crypto from 'crypto';
import { Spot } from '@binance/connector';
import { FundingHistoryQueryDto } from '../dto/funding-query.dto';

@Injectable()
export class FundingHistoryBinanceService {
  private readonly logger = new Logger(FundingHistoryBinanceService.name);

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

  async getFundingHistory(fundingHistoryQueryDto: FundingHistoryQueryDto) {
    const { page = 1, size = 50, endTime, startTime } = fundingHistoryQueryDto;
    try {
      const timestamp = Date.now();
      const params: any = {
        type: 'FUNDING_MAIN', // или 'MAIN_FUNDING'
        current: page,
        size: Math.min(size, 100),
        timestamp,
      };

      if (startTime) params.startTime = startTime;
      if (endTime) params.endTime = endTime;

      // Сортируем параметры для подписи
      const sortedParams = Object.keys(params)
        .sort()
        .reduce((obj, key) => {
          obj[key] = params[key];
          return obj;
        }, {});

      const signature = this.generateSignature(sortedParams);
      const queryString = new URLSearchParams({
        ...params,
        signature,
      }).toString();

      const response = await this.httpService.axiosRef.get(
        `https://api.binance.com/sapi/v1/asset/transfer?${queryString}`,
        {
          headers: { 'X-MBX-APIKEY': this.binance_api_key },
        },
      );

      return {
        total: response.data.total,
        rows: response.data.rows,
        current: page,
        size: size,
      };
    } catch (e) {
      console.error('Funding history error details:', {
        status: e.response?.status,
        data: e.response?.data,
        message: e.message,
      });
      this.logger.error('Funding history error:', e.message);
      return e.response?.data;
    }
  }
}
