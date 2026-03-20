import { Injectable } from '@nestjs/common';
import { Action, Ctx, Scene, SceneEnter } from 'nestjs-telegraf';
import { EMainActions } from '../../actions/enums/main.enum';
import type { SceneContext } from 'telegraf/scenes';
import { replenishSceneEnter } from './actions/scene-enter';
import { EReplenishMethod } from '../../actions/enums/replenish.enum';
import { replenishMethodAction } from './actions/replenish-method';
import { ECrypto } from '../../actions/enums/crypto.enum';
import { cryptoAction } from './actions/crypto';
import { BinanceService } from 'src/modules/binance/binance.service';

@Scene(EMainActions.REPLENISH)
@Injectable()
export class ReplenishScene {
  constructor(private readonly binanceService: BinanceService) {}

  @SceneEnter()
  onSceneEnter(@Ctx() ctx: SceneContext) {
    return replenishSceneEnter({ ctx });
  }

  @Action(Object.values(EReplenishMethod))
  onReplenishMethod(@Ctx() ctx: SceneContext) {
    return replenishMethodAction({ ctx });
  }

  @Action(Object.values(ECrypto))
  onReplenishCrypto(@Ctx() ctx: SceneContext) {
    return cryptoAction({ ctx, binanceService: this.binanceService });
  }
}
