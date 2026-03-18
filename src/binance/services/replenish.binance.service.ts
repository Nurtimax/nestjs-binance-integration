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

@Injectable()
export class ReplenishBinanceService {
  private readonly logger = new Logger(ReplenishBinanceService.name);

  private readonly binance_api_key: string =
    's1SkgWuCYweyjaBAckyP7sad3HnhWOflL0Rd7b0eg3XC9Ilz32GNwdut89fgR2bh';

  private readonly binance_secret_key: string =
    'gZ4X8siWuOm58TJOyzv2p80foS6MH0gUNfYGoWMqJrCws3YDtUKs6rfFa3ObxZ4z';

  constructor(private readonly httpService: HttpService) {}

  async getUSDTBalance(client: Spot) {
    try {
      const response = await client.account();
      const accountInfo = response.data;

      // Ищем USDT в балансах
      const usdtBalance = accountInfo.balances.find(
        (balance) => balance.asset === 'USDT',
      );

      console.log(usdtBalance, 'usdtBalance');

      if (!usdtBalance) {
        return {
          asset: 'USDT',
          free: 0,
          locked: 0,
          total: 0,
        };
      }

      const free = parseFloat(usdtBalance.free);
      const locked = parseFloat(usdtBalance.locked);

      return {
        asset: 'USDT',
        free: free,
        locked: locked,
        total: free + locked,
      };
    } catch (error) {
      console.log(error, 'error');
      throw new Error(`Failed to get USDT balance: ${error.message}`);
    }
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
