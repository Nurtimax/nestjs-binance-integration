import { ECrypto } from 'src/modules/telegram/actions/enums/crypto.enum';
import { EReplenishMethod } from 'src/modules/telegram/actions/enums/replenish.enum';
import { clearInlineKeyboard } from 'src/modules/telegram/actions/main-actions/clear-inline-keyboard';
import { SceneContext } from 'telegraf/scenes';
import { CallbackQuery, InlineKeyboardButton } from 'telegraf/types';

interface IMethodPayload {
  ctx: SceneContext;
}
export const replenishMethodAction = async (payload: IMethodPayload) => {
  const { ctx } = payload;

  await clearInlineKeyboard(ctx);

  const callback = ctx.callbackQuery as CallbackQuery;

  if (!('data' in callback)) return;

  const callback_data = callback.data as EReplenishMethod;

  const method = methods[callback_data || EReplenishMethod.CRYPTO];

  await ctx.replyWithPhoto(
    { source: 'src/assets/binance-test-addrss.jpg' },
    {
      caption: method.html,
      reply_markup: { inline_keyboard: method.inline_keyboard },
      parse_mode: 'HTML',
    },
  );

  await ctx.answerCbQuery('✅');
};

const replenishMethodCryptoHtml = `
<b>💎 Криптовалюта менен толтуруу</b>

<code>Oxdb579d46b5d4b405c11c71fad67c453704d9106cddd366515cf0642cbf6025d9</code>
`;

const replenishMethodBankHtml = `
<b>🏦 Банктык которуу менен толтуруу</b>

Банктык которуу аркылуу эсебиңизди толтура аласыз.

━━━━━━━━━━━━━━━━━━━━━
<b>💵 Валюта:</b> USD

<b>📋 Банк реквизиттери:</b>
• Bank: Wise / Revolut
• Account: XXXXXXXXXX
• SWIFT: XXXXXXXX

<b>⏱ Убакыт:</b> 1-3 жумуш күнү

<b>💰 Комиссия:</b> 0%

━━━━━━━━━━━━━━━━━━━━━
<b>📌 Которуу жасоодон мурун:</b>
1. Төмөнкү "Которуу жасадым" кнопкасын басыңыз
2. Которуу суммасын жазыңыз
3. Транзакция IDсин жазыңыз

<b>⚠️ Эскертүү:</b>
Которууну текшерүү 24 саатка чейин созулушу мүмкүн.
`;

const methods: Record<
  EReplenishMethod,
  { html: string; inline_keyboard: InlineKeyboardButton[][] }
> = {
  [EReplenishMethod.CRYPTO]: {
    html: replenishMethodCryptoHtml,
    inline_keyboard: [
      [
        { text: ECrypto.APT, callback_data: ECrypto.APT },
        { text: ECrypto.TON, callback_data: ECrypto.TON },
      ],
      [
        { text: ECrypto.BSC, callback_data: ECrypto.BSC },
        { text: ECrypto.ETH, callback_data: ECrypto.ETH },
      ],
      [
        { text: ECrypto.SOL, callback_data: ECrypto.SOL },
        { text: ECrypto.TRX, callback_data: ECrypto.TRX },
      ],
    ],
  },
  [EReplenishMethod.BANK]: {
    html: replenishMethodBankHtml,
    inline_keyboard: [],
  },
};
