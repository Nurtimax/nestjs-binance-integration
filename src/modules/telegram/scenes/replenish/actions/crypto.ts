import { BinanceService } from 'src/modules/binance/binance.service';
import { ECrypto } from 'src/modules/telegram/actions/enums/crypto.enum';
import { clearInlineKeyboard } from 'src/modules/telegram/actions/main-actions/clear-inline-keyboard';
import { SceneContext } from 'telegraf/scenes';
import { CallbackQuery } from 'telegraf/types';

interface ICryptoPayload {
  ctx: SceneContext;
  binanceService: BinanceService;
}
export const cryptoAction = async (payload: ICryptoPayload) => {
  const { ctx, binanceService } = payload;

  await clearInlineKeyboard(ctx);

  const callback = ctx.callbackQuery as CallbackQuery;

  if (!('data' in callback)) return;

  const callback_data = callback.data as ECrypto;

  const symbolPrice = await binanceService.getCryptoPrice(callback_data);

  console.log(symbolPrice, 'symbol price');

  const html = `
<b>💎 ${callback_data} / USDT</b>

💰 <b>Учурдагы баа:</b> ${symbolPrice.toFixed(4)} USDT

1 ${callback_data} = ${symbolPrice.toFixed(4)} USDT

Төмөнкү кнопка аркылуу толтура аласыз:
  `;

  await ctx.replyWithHTML(html);
};
