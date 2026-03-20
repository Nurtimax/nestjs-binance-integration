import { EReplenishMethod } from 'src/modules/telegram/actions/enums/replenish.enum';
import { SceneContext } from 'telegraf/scenes';
import { InlineKeyboardButton } from 'telegraf/types';

interface ISceneEnterPayload {
  ctx: SceneContext;
}
export const replenishSceneEnter = async (payload: ISceneEnterPayload) => {
  const { ctx } = payload;

  const html = `
<b>💰 Пополнение счета</b>

Выберите способ пополнения:

<b>💎 Криптовалюта</b>
• Быстрое пополнение
• Минимальная комиссия
• Поддерживаемые сети: TON, APT, SOL

<b>🏦 Банковский перевод</b>
• Пополнение в USD
• Обработка 1-3 рабочих дня
• Без комиссии

Выберите удобный способ:
  `;

  const inline_keyboard = REPLENISH_METHOD;
  await ctx.replyWithHTML(html, { reply_markup: { inline_keyboard } });
};

const REPLENISH_METHOD: InlineKeyboardButton[][] = [
  [
    // { text: EReplenishMethod.BANK, callback_data: EReplenishMethod.BANK },
    { text: EReplenishMethod.CRYPTO, callback_data: EReplenishMethod.CRYPTO },
  ],
];
