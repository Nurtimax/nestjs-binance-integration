import { SceneContext } from 'telegraf/scenes';
import { CallbackQuery } from 'telegraf/types';
import { EMainActions } from '../enums/main.enum';
import { clearInlineKeyboard } from './clear-inline-keyboard';

interface IMainActionsPayload {
  ctx: SceneContext;
}
export const mainActions = async (payload: IMainActionsPayload) => {
  const { ctx } = payload;

  await clearInlineKeyboard(ctx);

  const callback = ctx.callbackQuery as CallbackQuery;

  if (!('data' in callback)) return;

  const callback_data = callback.data as EMainActions;

  console.log(callback_data, 'callback data');

  await ctx.scene.enter(callback_data);

  await ctx.answerCbQuery('✅');
};
