import { SceneContext } from 'telegraf/scenes';

interface IUsePayload {
  ctx: SceneContext;
  next: () => Promise<void>;
}

export const useAction = async (payload: IUsePayload) => {
  const { ctx, next } = payload;

  const chat = ctx.chat;

  console.log(chat, 'chat');

  await next();
};
