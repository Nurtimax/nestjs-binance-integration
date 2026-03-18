/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as NestConfig from '@nestjs/config';

@Injectable()
export class ConfigsService {
  private readonly config_service: NestConfig.ConfigService;

  constructor(configService: NestConfig.ConfigService) {
    this.config_service = configService;
  }

  private getValue(name: string): string {
    const value = this.config_service.get<string>(name);
    if (value === undefined || value.length === 0) {
      throw new InternalServerErrorException(
        `${name} parameter does not specified in .env file`,
      );
    }

    return value;
  }

  public getString(name: string): string {
    return this.getValue(name);
  }

  public getNumber(name: string): number {
    const value = this.getValue(name);
    const number = parseFloat(value);

    if (Number.isNaN(number)) {
      throw new InternalServerErrorException(
        `${name} parameter does not specified correct  number format`,
      );
    }

    return number;
  }

  public getBoolean(name: string): boolean {
    const value = this.getValue(name);

    const truly = value === 'true';
    if (truly) {
      return truly;
    }

    const falsy = value === 'false';
    if (falsy) {
      return truly;
    }

    throw new InternalServerErrorException(
      `${name} parameter does not specified correct boolean format`,
    );
  }
}
