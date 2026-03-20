import { Injectable } from '@nestjs/common';
import { Action, Ctx, Next, Start, Update, Use } from 'nestjs-telegraf';
import { TelegramConfig } from 'src/configs/services/telegram.config';
import { Telegraf } from 'telegraf';
import type { SceneContext } from 'telegraf/scenes';
import { useAction } from './actions/use';
import { startAction } from './actions/start';
import { EMainActions } from './actions/enums/main.enum';
import { mainActions } from './actions/main-actions';

@Update()
@Injectable()
export class TelegramService extends Telegraf<SceneContext> {
  constructor(private readonly telegramConfig: TelegramConfig) {
    super(telegramConfig.bot_token);
  }

  @Use()
  onUse(@Ctx() ctx: SceneContext, @Next() next: () => Promise<void>) {
    return useAction({ ctx, next });
  }

  @Start()
  onStart(@Ctx() ctx: SceneContext) {
    return startAction({ ctx });
  }

  @Action(Object.values(EMainActions))
  onMainActions(@Ctx() ctx: SceneContext) {
    return mainActions({ ctx });
  }
}
