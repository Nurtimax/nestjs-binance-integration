import { Injectable } from '@nestjs/common';
import { ConfigsService } from '../configs.service';

@Injectable()
export class BinanceConfig {
  api_key: string;
  secret_key: string;

  constructor(private readonly configService: ConfigsService) {
    this.api_key = configService.getString('BINANCE_API_KEY');
    this.secret_key = configService.getString('BINANCE_SECRET_KEY');
  }
}
