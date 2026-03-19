import { SceneContext } from 'telegraf/scenes';
import { startWelcomeText } from './text/welcome-text';

interface IStartPayload {
  ctx: SceneContext;
}

export const startAction = async (payload: IStartPayload) => {
  const { ctx } = payload;

  const from = ctx.from;

  console.log(from, 'from');

  const userName = from?.first_name || from?.username || 'there';

  const text = startWelcomeText(userName);

  await ctx.replyWithHTML(text);
};
