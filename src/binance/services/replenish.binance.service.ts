/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger } from '@nestjs/common';
import { Spot } from '@binance/connector';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BinanceConfig } from 'src/configs/services/binance.config';

@Injectable()
export class ReplenishBinanceService {
  private readonly logger = new Logger(ReplenishBinanceService.name);

  private readonly binance_api_key: string;

  private readonly binance_secret_key: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly binanceConfig: BinanceConfig,
  ) {
    this.binance_api_key = binanceConfig.api_key;
    this.binance_secret_key = binanceConfig.secret_key;
  }

  async getUSDTBalance(client: Spot) {
    try {
      // 1. Спот баланс
      const spotResponse = await client.account();
      const spotBalances = spotResponse.data.balances;
      const spotUSDT = spotBalances.find((b) => b.asset === 'USDT');

      const spotFree = spotUSDT ? parseFloat(spotUSDT.free) : 0;
      const spotLocked = spotUSDT ? parseFloat(spotUSDT.locked) : 0;

      this.logger.log(`Спот USDT: ${spotFree + spotLocked}`);

      // 2. Funding баланс (көп учурда USDT ушул жерде)
      let fundingFree = 0;
      try {
        const fundingResponse = await client.fundingAsset();
        const fundingData = fundingResponse.data;
        const fundingUSDT = fundingData.find((f) => f.asset === 'USDT');
        fundingFree = fundingUSDT ? parseFloat(fundingUSDT.free) : 0;
        this.logger.log(`Funding USDT: ${fundingFree}`);
      } catch (e) {
        this.logger.warn('Funding баланс алуу мүмкүн эмес');
      }

      // 3. Earn баланс (стейкинг)
      let earnFree = 0;
      try {
        const earnResponse = await client.stakingProductPosition();
        console.log(earnResponse, 'earn response');

        // Эгер USDT стейкингде болсо...
      } catch (e) {
        // Ignore
      }

      const totalUSDT = spotFree + spotLocked + fundingFree;

      const result = {
        asset: 'USDT',
        spot: {
          free: spotFree,
          locked: spotLocked,
          total: spotFree + spotLocked,
        },
        funding: {
          free: fundingFree,
          total: fundingFree,
        },
        total: totalUSDT,
        note: totalUSDT === 2 ? '✅ Туура' : '⚠️ Дагы текшерүү керек',
      };

      this.logger.log(`Жалпы USDT: ${totalUSDT}`);
      return result;
    } catch (error) {
      this.logger.error(`Error getting USDT balance: ${error.message}`);
      throw new Error(`Failed to get USDT balance: ${error.message}`);
    }
  }

  async checkAllDeposits(coin: string = 'USDT') {
    try {
      // Бардык статустарды алуу (анын ичинде 0 - processing, 6 - credited but cannot withdraw)
      const allDeposits = await this.getDepositHistory({
        coin,
        limit: 100,
      });

      // Статустар боюнча бөлүү
      const pending = allDeposits.filter((d) => d.statusCode === 0);
      const success = allDeposits.filter((d) => d.statusCode === 1);
      const credited = allDeposits.filter((d) => d.statusCode === 6);

      return {
        message: this.getStatusMessage(
          pending.length,
          success.length,
          credited.length,
        ),
        pending: pending.map((d) => ({
          amount: d.amount,
          time: d.time,
          note: '⏳ Тастыктоо күтүлүүдө',
        })),
        success: success.map((d) => ({
          amount: d.amount,
          time: d.time,
          note: '✅ Баланска кошулду',
        })),
        credited: credited.map((d) => ({
          amount: d.amount,
          time: d.time,
          note: '⚠️ Баланска кошулды, бирок чыгаруу мүмкүн эмес (коопсуздук текшерүүсү)',
        })),
        totalFound: allDeposits.length,
        yourTransaction: 'TXID менен издеп көрүңүз',
      };
    } catch (error) {
      this.logger.error(`Error checking deposits: ${error.message}`);
      throw error;
    }
  }

  private getStatusMessage(
    pending: number,
    success: number,
    credited: number,
  ): string {
    if (pending > 0) {
      return `⏳ ${pending} транзакция тастыктоо күтүүдө. Бир аз күтүңүз.`;
    }
    if (credited > 0) {
      return `⚠️ ${credited} транзакция баланска кошулду, бирок чыгаруу убактылуу чектелген.`;
    }
    if (success === 0) {
      return `❌ Эч кандай транзакция табылган жок. Төмөнкүлөрдү текшериңиз:
        1. TXID туурабы?
        2. Тармак (network) туурабы?
        3. Сумма минималдуу лимиттен жогорубу?`;
    }
    return `✅ ${success} транзакция табылды`;
  }

  async getDepositHistory(params?: {
    coin?: string;
    status?: number;
    startTime?: number;
    endTime?: number;
    limit?: number;
    offset?: number;
  }) {
    try {
      const timestamp = Date.now();

      // Формируем параметры запроса
      const queryParams: Record<string, any> = {
        timestamp,
        ...(params?.coin && { coin: params.coin.toUpperCase() }),
        ...(params?.status !== undefined && { status: params.status }),
        ...(params?.startTime && { startTime: params.startTime }),
        ...(params?.endTime && { endTime: params.endTime }),
        ...(params?.limit && { limit: Math.min(params.limit, 1000) }),
        ...(params?.offset && { offset: params.offset }),
      };

      // *** ТУУРА ЖОЛ: Signature генерациясы ***

      // 1. Сортируем ключи по алфавиту (обязательно для Binance)
      const sortedKeys = Object.keys(queryParams).sort();

      // 2. SIGNATURE ҮЧҮН: RAW query string (БЕЗ encodeURIComponent!)
      const rawQueryString = sortedKeys
        .map((key) => `${key}=${queryParams[key]}`) // encodeURIComponent колдонулбайт!
        .join('&');

      this.logger.debug(`RAW query string for signature: ${rawQueryString}`);

      // 3. Генерируем подпись из RAW строки
      const signature = crypto
        .createHmac('sha256', this.binance_secret_key)
        .update(rawQueryString)
        .digest('hex');

      this.logger.debug(`Generated signature: ${signature}`);

      // 4. HTTP СУРАМ ҮЧҮН: Encoded query string (кодировка керек!)
      const encodedQueryString = sortedKeys
        .map((key) => `${key}=${encodeURIComponent(queryParams[key])}`)
        .join('&');

      // 5. Финалдык URL: encoded параметрлер + signature
      const finalUrl = `https://api.binance.com/sapi/v1/capital/deposit/hisrec?${encodedQueryString}&signature=${signature}`;

      this.logger.debug(`Final URL: ${finalUrl}`);

      // Отправляем запрос
      const response = await firstValueFrom(
        this.httpService.get(finalUrl, {
          headers: {
            'X-MBX-APIKEY': this.binance_api_key,
          },
        }),
      );

      const deposits = response.data;

      // Форматируем для удобного чтения
      return deposits.map((deposit: any) => ({
        id: deposit.id,
        coin: deposit.coin,
        amount: parseFloat(deposit.amount),
        network: deposit.network,
        status: this.getDepositStatusText(deposit.status),
        statusCode: deposit.status,
        address: deposit.address,
        fromAddress: deposit.sourceAddress || 'Не указан',
        txId: deposit.txId,
        time: new Date(deposit.insertTime).toLocaleString(),
        insertTime: deposit.insertTime,
        confirmTimes: deposit.confirmTimes,
      }));
    } catch (error) {
      // Толук ката маалыматын көрсөтүү
      this.logger.error(`Error response data:`, error.response?.data);
      this.logger.error(`Error status: ${error.response?.status}`);
      this.logger.error(`Error message: ${error.message}`);
      throw new Error(`Failed to get deposit history: ${error.message}`);
    }
  }

  /**
   * Получить пополнения за последние N дней
   */
  async getRecentDeposits(days: number = 7, coin?: string): Promise<any[]> {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;

    return this.getDepositHistory({
      coin,
      startTime,
      endTime,
      limit: 1000,
    });
  }

  /**
   * Получить общую сумму полученных USDT за период
   */
  async getTotalUSDTReceived(days?: number) {
    let deposits;
    if (days) {
      deposits = await this.getRecentDeposits(days, 'USDT');
    } else {
      deposits = await this.getUSDTDeposits(1000);
    }

    // Только успешные депозиты
    const successfulDeposits = deposits.filter((d) => d.statusCode === 1);

    const total = successfulDeposits.reduce(
      (sum, deposit) => sum + deposit.amount,
      0,
    );

    return {
      total,
      count: successfulDeposits.length,
      deposits: successfulDeposits,
    };
  }

  async getSuccessfulDeposits(coin?: string, limit: number = 50) {
    return this.getDepositHistory({
      coin,
      status: 1, // 1 = успешно
      limit,
    });
  }

  async getUSDTDeposits(limit: number = 50): Promise<any[]> {
    const deposits = await this.getDepositHistory({
      coin: 'USDT',
      limit,
    });
    return deposits;
  }

  /**
   * Получить текстовое описание статуса
   */
  private getDepositStatusText(status: number): string {
    const statusMap: Record<number, string> = {
      0: '⏳ В обработке',
      1: '✅ Успешно зачислено',
      6: '⚠️ Зачислено, но нельзя вывести',
      7: '❌ Ошибочный депозит',
    };
    return statusMap[status] || `Неизвестный статус (${status})`;
  }
}
