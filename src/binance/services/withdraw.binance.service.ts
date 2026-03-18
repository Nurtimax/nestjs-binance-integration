/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WithdrawBinanceService {
  private readonly logger = new Logger(WithdrawBinanceService.name);

  private readonly binance_api_key: string =
    's1SkgWuCYweyjaBAckyP7sad3HnhWOflL0Rd7b0eg3XC9Ilz32GNwdut89fgR2bh';

  private readonly binance_secret_key: string =
    'gZ4X8siWuOm58TJOyzv2p80foS6MH0gUNfYGoWMqJrCws3YDtUKs6rfFa3ObxZ4z';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Получить историю выводов (withdraw history)
   * GET /sapi/v1/capital/withdraw/history [citation:1]
   * @param params Параметры фильтрации
   */
  async getWithdrawHistory(params?: {
    coin?: string; // Фильтр по монете (USDT, BTC, и т.д.)
    status?: number; // Статус: 0(Email Sent),1(Cancelled),2(Awaiting Approval),3(Rejected),4(Processing),5(Failure),6(Completed)
    startTime?: number; // Начало периода в миллисекундах
    endTime?: number; // Конец периода
    limit?: number; // Количество записей (max 1000)
    offset?: number; // Смещение для пагинации
    withdrawOrderId?: string; // ID ордера на вывод
  }): Promise<any[]> {
    try {
      const timestamp = Date.now();

      // Формируем параметры запроса
      const queryParams: Record<string, any> = {
        timestamp,
        ...(params?.coin && { coin: params.coin.toUpperCase() }),
        ...(params?.status !== undefined && { status: params.status }),
        ...(params?.startTime && { startTime: params.startTime }),
        ...(params?.endTime && { endTime: params.endTime }),
        ...(params?.limit && { limit: Math.min(params.limit, 1000) }), // Max 1000 [citation:1]
        ...(params?.offset && { offset: params.offset }),
        ...(params?.withdrawOrderId && {
          withdrawOrderId: params.withdrawOrderId,
        }),
      };

      this.logger.log(
        `Getting withdraw history with params: ${JSON.stringify(queryParams)}`,
      );

      // Сортируем ключи по алфавиту
      const sortedKeys = Object.keys(queryParams).sort();

      // RAW query string для подписи (БЕЗ encodeURIComponent!)
      const rawQueryString = sortedKeys
        .map((key) => `${key}=${queryParams[key]}`)
        .join('&');

      // Генерируем подпись
      const signature = crypto
        .createHmac('sha256', this.binance_secret_key)
        .update(rawQueryString)
        .digest('hex');

      // Кодированная строка для URL
      const encodedQueryString = sortedKeys
        .map((key) => `${key}=${encodeURIComponent(queryParams[key])}`)
        .join('&');

      const url = `https://api.binance.com/sapi/v1/capital/withdraw/history?${encodedQueryString}&signature=${signature}`;

      const response = await firstValueFrom(
        this.httpService.get(url, {
          headers: {
            'X-MBX-APIKEY': this.binance_api_key,
          },
        }),
      );

      const withdraws = response.data;

      // Форматируем для удобного чтения
      return withdraws.map((withdraw: any) => ({
        id: withdraw.id, // ID вывода в Binance [citation:1]
        coin: withdraw.coin, // Монета (USDT, BTC, etc.)
        amount: parseFloat(withdraw.amount), // Сумма вывода
        transactionFee: parseFloat(withdraw.transactionFee), // Комиссия
        status: this.getWithdrawStatusText(withdraw.status),
        statusCode: withdraw.status,
        address: withdraw.address, // Адрес получателя
        txId: withdraw.txId, // Хэш транзакции в блокчейне
        applyTime: withdraw.applyTime, // Время запроса (UTC)
        network: withdraw.network, // Сеть: "ETH", "BEP20", "TRC20" [citation:1]
        transferType:
          withdraw.transferType === 1
            ? 'Внутренний перевод'
            : 'Внешний перевод',
        info: withdraw.info || '', // Причина ошибки, если есть
        confirmNo: withdraw.confirmNo, // Количество подтверждений
        walletType:
          withdraw.walletType === 1 ? 'Funding Wallet' : 'Spot Wallet',
        completeTime: withdraw.completeTime || null, // Время завершения
        withdrawOrderId: withdraw.withdrawOrderId || null,
      }));
    } catch (error) {
      this.logger.error(
        `Error getting withdraw history: ${error.message}`,
        error.response?.data,
      );
      throw new Error(`Failed to get withdraw history: ${error.message}`);
    }
  }

  /**
   * Получить только USDT выводы
   */
  async getUSDTWithdraws(limit: number = 50): Promise<any[]> {
    return this.getWithdrawHistory({
      coin: 'USDT',
      limit,
    });
  }

  /**
   * Получить успешные выводы (статус 6 - Completed) [citation:1]
   */
  async getSuccessfulWithdraws(
    coin?: string,
    limit: number = 50,
  ): Promise<any[]> {
    return this.getWithdrawHistory({
      coin,
      status: 6, // 6 = Completed [citation:1]
      limit,
    });
  }

  /**
   * Получить выводы в обработке
   */
  async getPendingWithdraws(coin?: string, limit: number = 50): Promise<any[]> {
    return this.getWithdrawHistory({
      coin,
      status: 4, // 4 = Processing [citation:1]
      limit,
    });
  }

  /**
   * Получить выводы за последние N дней
   */
  async getRecentWithdraws(days: number = 7, coin?: string): Promise<any[]> {
    const endTime = Date.now();
    const startTime = endTime - days * 24 * 60 * 60 * 1000;

    // Временной интервал не должен превышать 90 дней [citation:1]
    return this.getWithdrawHistory({
      coin,
      startTime,
      endTime,
      limit: 1000,
    });
  }

  /**
   * Получить общую сумму выводов USDT за период
   */
  async getTotalUSDTWithdrawn(days?: number): Promise<{
    total: number;
    count: number;
    withdraws: any[];
  }> {
    let withdraws;
    if (days) {
      withdraws = await this.getRecentWithdraws(days, 'USDT');
    } else {
      withdraws = await this.getUSDTWithdraws(1000);
    }

    // Только успешные выводы
    const successfulWithdraws = withdraws.filter((w) => w.statusCode === 6);

    const total = successfulWithdraws.reduce(
      (sum, withdraw) => sum + withdraw.amount,
      0,
    );

    return {
      total,
      count: successfulWithdraws.length,
      withdraws: successfulWithdraws,
    };
  }

  /**
   * Получить текстовое описание статуса вывода [citation:1]
   */
  private getWithdrawStatusText(status: number): string {
    const statusMap: Record<number, string> = {
      0: '📧 Email Sent (отправлено на email)',
      1: '❌ Cancelled (отменено)',
      2: '⏳ Awaiting Approval (ожидает подтверждения)',
      3: '🚫 Rejected (отклонено)',
      4: '🔄 Processing (в обработке)',
      5: '❌ Failure (ошибка)',
      6: '✅ Completed (завершено)',
    };
    return statusMap[status] || `Неизвестный статус (${status})`;
  }

  /**
   * Проверить конкретный вывод по ID
   */
  async checkWithdrawById(withdrawId: string) {
    const withdraws = await this.getWithdrawHistory({ limit: 1000 });
    return withdraws.find((w) => w.id === withdrawId) || null;
  }

  /**
   * Проверить вывод по TXID
   */
  async checkWithdrawByTxId(txId: string) {
    const withdraws = await this.getWithdrawHistory({ limit: 1000 });
    return withdraws.find((w) => w.txId === txId) || null;
  }
}
