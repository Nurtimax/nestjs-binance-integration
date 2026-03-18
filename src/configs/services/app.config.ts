import { Injectable } from '@nestjs/common';
import { ConfigsService } from '../configs.service';

@Injectable()
export class AppConfig {
  public readonly port: number;

  constructor(private readonly configService: ConfigsService) {
    this.port = this.configService.getNumber('APP_PORT');
  }
}
