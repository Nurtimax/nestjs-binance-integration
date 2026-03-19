import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinanceModule } from './modules/binance/binance.module';
import { ConfigsModule } from './configs/configs.module';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { TelegramConfig } from './configs/services/telegram.config';
import { TelegramModule } from './modules/telegram/telegram.module';

@Module({
  imports: [
    BinanceModule,
    ConfigsModule,
    TelegrafModule.forRootAsync({
      botName: 'main_bot',
      imports: [ConfigsModule],
      inject: [TelegramConfig],
      useFactory: (telegramConfig: TelegramConfig) => ({
        token: telegramConfig.bot_token,
        middlewares: [
          session({
            defaultSession() {
              const object = {};
              return object;
            },
          }),
        ],
        include: [TelegramModule],
        launchOptions: {
          allowedUpdates: [],
          dropPendingUpdates: true,
        },
      }),
    }),
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
