import { InlineKeyboardButton } from 'telegraf/types';
import { EMainActions } from '../../enums/main.enum';

export const START_KEYBOARDS: InlineKeyboardButton[][] = [
  [{ text: EMainActions.REPLENISH, callback_data: EMainActions.REPLENISH }],
];
