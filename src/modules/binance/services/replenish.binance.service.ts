/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Spot } from '@binance/connector';
import * as crypto from 'crypto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BinanceConfig } from 'src/configs/services/binance.config';
import { GetOrderHistoryQueryDto } from '../dto/get-order-history.dto';
import {
  cryptoToSymbol,
  ECrypto,
} from 'src/modules/telegram/actions/enums/crypto.enum';

@Injectable()
export class ReplenishBinanceService implements OnModuleInit {
  private readonly logger = new Logger(ReplenishBinanceService.name);

  private client: Spot;

  private readonly binance_api_key: string;

  private readonly binance_secret_key: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly binanceConfig: BinanceConfig,
  ) {
    console.log(binanceConfig.api_key, 'api key', binanceConfig.secret_key);

    this.binance_api_key = binanceConfig.api_key;
    this.binance_secret_key = binanceConfig.secret_key;
  }

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

  async account() {
    try {
      const timestamp = Date.now();

      const params = {
        timestamp,
      };

      // Сортировка жана signature генерациясы
      const queryString = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');

      const signature = crypto
        .createHmac('sha256', this.binance_secret_key)
        .update(queryString)
        .digest('hex');

      const response = await this.httpService.axiosRef.get(
        'https://api.binance.com/api/v3/account',
        {
          headers: {
            'X-MBX-APIKEY': this.binance_api_key,
          },
          params: {
            ...params,
            signature,
          },
        },
      );

      const resonseData = response.data;

      const balances = resonseData?.balances;

      if (Array.isArray(balances)) {
        const reducedBalances = balances.filter((balance) =>
          Number(balance.free),
        );

        console.log(reducedBalances, 'reduced balances');
      }
    } catch (error) {
      console.log(error, 'error');
    }
  }

  async order() {
    try {
      const timestamp = Date.now();

      const params = {
        symbol: 'TONUSDT',
        timestamp,
      };

      // Сортировка жана signature генерациясы
      const queryString = Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join('&');

      const signature = crypto
        .createHmac('sha256', this.binance_secret_key)
        .update(queryString)
        .digest('hex');

      const response = await this.httpService.axiosRef.get(
        'https://api.binance.com/api/v3/order',
        {
          headers: {
            'X-MBX-APIKEY': this.binance_api_key,
          },
          params: {
            ...params,
            signature,
          },
        },
      );

      console.log(response, 'response');
    } catch (error) {
      console.log(error, 'error');
    }
  }

  async allOrders(params?: GetOrderHistoryQueryDto) {
    try {
      const responseOrders = await this.client.allOrders(params?.symbol, {
        limit: params?.limit,
      });

      console.log(responseOrders.data, 'response order');
      return responseOrders.data;
    } catch (error) {
      console.log(error, 'error');
      return {
        message: error?.message,
        error,
      };
    }
  }

  async getTONtoUSDTPrice() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          'https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT',
        ),
      );

      const price = parseFloat(response.data.price);
      return price;
    } catch (error) {
      this.logger.error('Error getting TON/USDT price:', error.message);
      throw new Error('Failed to get TON/USDT price');
    }
  }

  async getCryptoPrice(crypto: ECrypto) {
    try {
      const symbol = cryptoToSymbol[crypto];
      const response = await firstValueFrom(
        this.httpService.get(
          `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        ),
      );

      const price = parseFloat(response.data.price);
      return price;
    } catch (error) {
      this.logger.error(`Error getting ${crypto}/USDT price:`, error.message);
      throw new Error(`Failed to get ${crypto}/USDT price`);
    }
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

      // 2. Funding баланс - GET сурамы менен
      let fundingFree = 0;
      try {
        const timestamp = Date.now();

        const params = {
          timestamp,
          recvWindow: 60000,
        };

        // Сортировка жана signature генерациясы
        const queryString = Object.keys(params)
          .sort()
          .map((key) => `${key}=${params[key]}`)
          .join('&');

        const signature = crypto
          .createHmac('sha256', this.binance_secret_key)
          .update(queryString)
          .digest('hex');

        // GET сурамы (POST эмес!)
        const fundingResponse = await firstValueFrom(
          this.httpService.get(
            'https://api.binance.com/sapi/v1/asset/get-funding-asset',
            {
              headers: {
                'X-MBX-APIKEY': this.binance_api_key,
              },
              params: {
                ...params,
                signature,
              },
            },
          ),
        );

        const fundingData = fundingResponse.data;
        const fundingUSDT = fundingData.find((f: any) => f.asset === 'USDT');
        fundingFree = fundingUSDT ? parseFloat(fundingUSDT.free) : 0;

        this.logger.log(`Funding USDT: ${fundingFree}`);
      } catch (e) {
        this.logger.warn(`Funding баланс алуу мүмкүн эмес: ${e.message}`);
      }

      // 3. Total
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
        expected: 2,
        diff: (2 - totalUSDT).toFixed(8),
        note:
          totalUSDT === 2
            ? '✅ Туура'
            : `❌ ${2 - totalUSDT} USDT дагы бир жерде`,
        suggestion: totalUSDT < 2 ? 'Башка кошелектерди текшериңиз' : undefined,
      };

      this.logger.log(`Жалпы USDT: ${totalUSDT}`);
      return result;
    } catch (error) {
      this.logger.error(`Error getting USDT balance: ${error.message}`);
      throw new Error(`Failed to get USDT balance: ${error.message}`);
    }
  }

  private generateSignature(params: Record<string, any>): string {
    const queryString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    console.log('Query String for Signature:', queryString); // Текшерүү
    const signature = crypto
      .createHmac('sha256', this.binance_secret_key)
      .update(queryString)
      .digest('hex');
    console.log('Generated Signature:', signature); // Текшерүү
    return signature;
  }

  // Альтернативдүү метод
  async tryAlternativeFundingBalance() {
    try {
      const timestamp = Date.now();
      const params = { timestamp, recvWindow: 60000 };

      const signature = this.generateSignature(params);

      // Башка эндпоинт: accountSnapshot
      const snapshotResponse = await firstValueFrom(
        this.httpService.get(
          'https://api.binance.com/sapi/v1/accountSnapshot',
          {
            headers: { 'X-MBX-APIKEY': this.binance_api_key },
            params: {
              ...params,
              type: 'SPOT',
              signature,
            },
          },
        ),
      );

      const snapshot = snapshotResponse.data;
      this.logger.log('Account snapshot:', snapshot);

      // Snapshot ичиндеги баланстарды талдоо
      if (snapshot.snapshotVos && snapshot.snapshotVos.length > 0) {
        const latest = snapshot.snapshotVos[0];
        const balances = latest.data.balances;
        const usdtBalance = balances.find((b: any) => b.asset === 'USDT');
        if (usdtBalance) {
          this.logger.log(`Snapshot USDT: ${usdtBalance.free}`);
          return parseFloat(usdtBalance.free);
        }
      }

      return 0;
    } catch (e) {
      console.log(e, 'error');

      this.logger.warn('Snapshot дагы иштебеди');
      return 0;
    }
  }

  async getAllBalancesAcrossProducts() {
    const results = {
      spot: { usdt: 0, total: 0 },
      funding: { usdt: 0, total: 0 },
      earn: { usdt: 0, total: 0 },
      staking: { usdt: 0, total: 0 },
      margin: { usdt: 0, total: 0 },
      futures: { usdt: 0, total: 0 },
      p2p: { usdt: 0, total: 0 },
      totalUSDT: 0,
      timestamp: new Date().toISOString(),
    };

    // 1. SPOT (иштеп жатат)
    try {
      const spot = await this.client.account();
      const spotBalances = spot.data.balances;
      const spotUSDT = spotBalances.find((b) => b.asset === 'USDT');
      results.spot.usdt = spotUSDT
        ? parseFloat(spotUSDT.free) + parseFloat(spotUSDT.locked)
        : 0;
      results.spot.total = spotBalances.filter(
        (b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0,
      ).length;
    } catch (e) {
      this.logger.error('Spot error:', e.message);
    }

    // 2. FUNDING (POST менен)
    try {
      const timestamp = Date.now();
      const params = { timestamp, recvWindow: 60000 };
      const signature = this.generateSignature(params);

      console.log(this.binance_api_key, 'this.binance_api_key');

      const funding = await firstValueFrom(
        this.httpService.post(
          'https://api.binance.com/sapi/v1/asset/get-funding-asset',
          null,
          {
            headers: {
              'X-MBX-APIKEY': this.binance_api_key,
              'Content-Type': 'application/json',
            },
            params: { ...params, signature },
          },
        ),
      );

      const fundingUSDT = funding.data.find((f: any) => f.asset === 'USDT');
      results.funding.usdt = fundingUSDT ? parseFloat(fundingUSDT.free) : 0;
      results.funding.total = funding.data.filter(
        (f: any) => parseFloat(f.free) > 0,
      ).length;
    } catch (e) {
      this.logger.error('Funding error:', e.message);
    }

    // 3. SIMPLE EARN (стейкинг)
    try {
      const timestamp = Date.now();
      const params = { timestamp, recvWindow: 60000 };
      const signature = this.generateSignature(params);

      // Flexible Earn позициялары
      const flexible = await firstValueFrom(
        this.httpService.get(
          'https://api.binance.com/sapi/v1/simple-earn/flexible/position',
          {
            headers: { 'X-MBX-APIKEY': this.binance_api_key },
            params: { ...params, signature },
          },
        ),
      );

      // Locked Earn позициялары
      const locked = await firstValueFrom(
        this.httpService.get(
          'https://api.binance.com/sapi/v1/simple-earn/locked/position',
          {
            headers: { 'X-MBX-APIKEY': this.binance_api_key },
            params: { ...params, signature },
          },
        ),
      );

      // USDT суммасын эсептөө
      const flexibleUSDT =
        flexible.data.rows
          ?.filter((r: any) => r.asset === 'USDT')
          .reduce(
            (sum: number, r: any) => sum + parseFloat(r.totalAmount),
            0,
          ) || 0;

      const lockedUSDT =
        locked.data.rows
          ?.filter((r: any) => r.asset === 'USDT')
          .reduce((sum: number, r: any) => sum + parseFloat(r.amount), 0) || 0;

      results.earn.usdt = flexibleUSDT + lockedUSDT;
      results.earn.total =
        (flexible.data.rows?.length || 0) + (locked.data.rows?.length || 0);
    } catch (e) {
      this.logger.error('Earn error:', e.message);
    }

    // 4. STAKING (атайын пакет менен) [citation:1]
    try {
      // npm install @binance/staking керек
      // const stakingClient = new Staking({ configurationRestAPI: { apiKey, apiSecret } });
      // const stakingPositions = await stakingClient.restAPI.getStakingProductList();
      // эгер USDT стейкингде болсо...
      results.staking.usdt = 0; // убактылуу
    } catch (e) {
      this.logger.error('Staking error:', e.message);
    }

    // 5. MARGIN
    try {
      const timestamp = Date.now();
      const params = { timestamp, recvWindow: 60000 };
      const signature = this.generateSignature(params);

      const margin = await firstValueFrom(
        this.httpService.get('https://api.binance.com/sapi/v1/margin/account', {
          headers: { 'X-MBX-APIKEY': this.binance_api_key },
          params: { ...params, signature },
        }),
      );

      const marginUSDT = margin.data.userAssets?.find(
        (a: any) => a.asset === 'USDT',
      );
      results.margin.usdt = marginUSDT
        ? parseFloat(marginUSDT.free) + parseFloat(marginUSDT.locked)
        : 0;
      results.margin.total = margin.data.userAssets?.length || 0;
    } catch (e) {
      this.logger.error('Margin error:', e.message);
    }

    // 6. FUTURES [citation:4]
    try {
      const timestamp = Date.now();
      const params = { timestamp, recvWindow: 60000 };
      const signature = this.generateSignature(params);

      const futures = await firstValueFrom(
        this.httpService.get('https://fapi.binance.com/fapi/v2/account', {
          headers: { 'X-MBX-APIKEY': this.binance_api_key },
          params: { ...params, signature },
        }),
      );

      const futuresUSDT = futures.data.assets?.find(
        (a: any) => a.asset === 'USDT',
      );
      results.futures.usdt = futuresUSDT
        ? parseFloat(futuresUSDT.walletBalance)
        : 0;
      results.futures.total = futures.data.assets?.length || 0;
    } catch (e) {
      this.logger.error('Futures error:', e.message);
    }

    // 7. P2P / Wallet Balance [citation:8]
    try {
      const timestamp = Date.now();
      const params = { timestamp, recvWindow: 60000 };
      const signature = this.generateSignature(params);

      const wallet = await firstValueFrom(
        this.httpService.get(
          'https://api.binance.com/sapi/v1/asset/wallet/balance',
          {
            headers: { 'X-MBX-APIKEY': this.binance_api_key },
            params: { ...params, signature },
          },
        ),
      );

      const walletUSDT = wallet.data.find((w: any) => w.asset === 'USDT');
      results.p2p.usdt = walletUSDT ? parseFloat(walletUSDT.balance) : 0;
      results.p2p.total = wallet.data.length;
    } catch (e) {
      this.logger.error('Wallet balance error:', e.message);
    }

    // 8. Жалпы USDT суммасы
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

  async checkMyIP() {
    try {
      const response = await firstValueFrom(
        this.httpService.get('https://api.ipify.org?format=json'),
      );

      const myIP = response.data.ip;

      return {
        yourPublicIP: myIP,
        message: 'Бул IP дарегин API уруксаттарына кошуңуз',
        apiIPs: ['192.168.0.1', '192.168.0.100'], // сиздин учурдагы кошулган IP
        suggestion: `API Management бөлүмүндө ${myIP} кошуңуз`,
        curl: `curl ifconfig.me (терминалда териңиз)`,
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  async getEstimatedBalanceInUSDT() {
    try {
      // 1. БАРДЫК КОШЕЛЕКТЕРДЕГИ БАЛАНСТАРДЫ АЛУУ
      const allBalances = await this.getAllBalancesAcrossProducts();

      // 2. БАРДЫК УНИКАЛДУУ МОНЕТАЛАРДЫ ЧОГУЛТУУ
      const uniqueAssets = new Set<string>();
      const assetBalances: Record<string, number> = {};

      console.log(allBalances, 'all bald');

      // Спот баланстар
      for (const balance of (allBalances.spot as unknown as Array<any>) || []) {
        if (
          balance.asset &&
          parseFloat(balance.free) + parseFloat(balance.locked) > 0
        ) {
          uniqueAssets.add(balance.asset);
          assetBalances[balance.asset] =
            (assetBalances[balance.asset] || 0) +
            parseFloat(balance.free) +
            parseFloat(balance.locked);
        }
      }

      // Funding баланстар
      for (const balance of (allBalances.funding as unknown as Array<any>) ||
        []) {
        if (balance.asset && parseFloat(balance.free) > 0) {
          uniqueAssets.add(balance.asset);
          assetBalances[balance.asset] =
            (assetBalances[balance.asset] || 0) + parseFloat(balance.free);
        }
      }

      // Earn баланстар
      if (allBalances.earn?.usdt) {
        assetBalances['USDT'] =
          (assetBalances['USDT'] || 0) + allBalances.earn.usdt;
        uniqueAssets.add('USDT');
      }

      // 3. АР БИР МОНЕТАНЫН БААСЫН АЛУУ (USDT менен баасы)
      const prices: Record<string, number> = {};

      // USDT өзүнүн баасы 1
      prices['USDT'] = 1;
      prices['BUSD'] = 1; // Stablecoinдер
      prices['USDC'] = 1;
      prices['DAI'] = 1;

      // Башка монеталардын баасын алуу
      const assetsToFetch = Array.from(uniqueAssets).filter((a) => !prices[a]);

      for (const asset of assetsToFetch) {
        try {
          // Монетанын USDTдеги баасын алуу
          const ticker = await this.client.tickerPrice(`${asset}USDT`);
          prices[asset] = parseFloat(ticker.data.price);
        } catch (e) {
          console.log(e, 'e');

          // Эгер USDT пары жок болсо, BTC менен аракет кылабыз
          try {
            const btcTicker = await this.client.tickerPrice(`${asset}BTC`);
            const btcPrice = await this.client.tickerPrice('BTCUSDT');
            prices[asset] =
              parseFloat(btcTicker.data.price) *
              parseFloat(btcPrice.data.price);
          } catch (e2) {
            console.log(e2, 'e2');

            this.logger.warn(`Could not get price for ${asset}`);
            prices[asset] = 0;
          }
        }
      }

      // 4. ЖАЛПЫ СУММАНЫ ЭСЕПТӨӨ
      let totalUSDT = 0;
      const breakdown: any[] = [];

      for (const [asset, amount] of Object.entries(assetBalances)) {
        const price = prices[asset] || 0;
        const value = amount * price;

        if (value > 0.01) {
          // Кичине суммаларды көрсөтпөө
          breakdown.push({
            asset,
            amount,
            priceInUSDT: price,
            valueInUSDT: value,
          });
          totalUSDT += value;
        }
      }

      // Сортировка по убыванию
      breakdown.sort((a, b) => b.valueInUSDT - a.valueInUSDT);

      return {
        totalEstimatedBalance: totalUSDT,
        currency: 'USDT',
        breakdown,
        assetCount: breakdown.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Error calculating estimated balance: ${error.message}`,
      );
      throw error;
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
      return deposits.map((deposit: any) => {
        console.log(deposit, 'deposite history');

        return {
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
        };
      });
    } catch (error) {
      console.log(error, 'error');

      // Толук ката маалыматын көрсөтүү
      this.logger.error(`Error response data:`, error.response?.data);
      this.logger.error(`Error status: ${error.response?.status}`);
      this.logger.error(`Error message: ${error.message}`);
      throw new Error(`Failed to get deposit history: ${error.message}`);
    }
  }

  async getOrderHistory(params?: GetOrderHistoryQueryDto) {
    try {
      const timestamp = Date.now();

      // Формируем параметры запроса
      const queryParams: Record<string, any> = {
        timestamp,
        ...(params?.symbol && { symbol: params.symbol.toUpperCase() }),
        ...(params?.orderId && { orderId: params.orderId }),
        ...(params?.startTime && { startTime: params.startTime }),
        ...(params?.endTime && { endTime: params.endTime }),
        ...(params?.limit && { limit: Math.min(params.limit, 1000) }),
        ...(params?.recvWindow && { recvWindow: params.recvWindow }),
      };

      // Сортируем ключи
      const sortedKeys = Object.keys(queryParams).sort();

      // RAW query string для подписи
      const rawQueryString = sortedKeys
        .map((key) => `${key}=${queryParams[key]}`)
        .join('&');

      // Генерируем подпись
      const signature = crypto
        .createHmac('sha256', this.binance_secret_key)
        .update(rawQueryString)
        .digest('hex');

      // Encoded query string для URL
      const encodedQueryString = sortedKeys
        .map((key) => `${key}=${encodeURIComponent(queryParams[key])}`)
        .join('&');

      // URL для истории ордеров
      const finalUrl = `https://api.binance.com/api/v3/allOrders?${encodedQueryString}&signature=${signature}`;

      const response = await firstValueFrom(
        this.httpService.get(finalUrl, {
          headers: {
            'X-MBX-APIKEY': this.binance_api_key,
          },
        }),
      );

      // Форматируем ответ
      return response.data.map((order: any) => {
        console.log(order, 'order history');

        return {
          orderId: order.orderId,
          symbol: order.symbol,
          price: parseFloat(order.price),
          origQty: parseFloat(order.origQty),
          executedQty: parseFloat(order.executedQty),
          status: order.status,
          type: order.type,
          side: order.side,
          time: new Date(order.time).toLocaleString(),
          updateTime: new Date(order.updateTime).toLocaleString(),
          isWorking: order.isWorking,
        };
      });
    } catch (error) {
      this.logger.error(
        'Error getting order history:',
        error.response?.data || error.message,
      );
      throw new Error(`Failed to get order history: ${error.message}`);
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
