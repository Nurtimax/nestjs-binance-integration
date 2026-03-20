/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { SceneContext } from 'telegraf/scenes';
import { Message } from 'telegraf/types';

export const clearInlineKeyboard = async (ctx: SceneContext) => {
  // Проверяем наличие callback query
  if (!ctx.callbackQuery) {
    return;
  }

  try {
    const message = ctx.callbackQuery.message as Message;

    if (!message) {
      return;
    }

    // Проверяем, что у сообщения есть reply_markup
    const keyboard = (message as any).reply_markup;

    // Условия для удаления:
    // 1. Клавиатура существует
    // 2. У клавиатуры есть inline_keyboard
    // 3. inline_keyboard не пустой
    if (
      keyboard &&
      keyboard.inline_keyboard &&
      keyboard.inline_keyboard.length > 0
    ) {
      await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
      console.log('Клавиатура успешно очищена');
    } else {
      console.log('Клавиатура уже очищена или отсутствует');
    }
  } catch (error: any) {
    // Обрабатываем только неожиданные ошибки
    if (!error?.description?.includes('message is not modified')) {
      console.error('Неожиданная ошибка:', error);
    }
  } finally {
    // Отвечаем на callback query
    await ctx.answerCbQuery().catch(() => {});
  }
};
