export const startWelcomeText = (userName: string) => {
  const welcomeText = `
👋 Welcome <b>${userName}</b> to the Binance Bot!

This bot helps you manage your Binance account and track your cryptocurrency activities.

✨ <b>Available Commands:</b>

• /start - Show this welcome message
• /balance - Check your account balance
• /deposits - View deposit history
• /orders - Check your current orders
• /history - View order history
• /help - Get help and support

🔒 <b>Your security is important:</b>
All API keys are encrypted and stored securely. Never share your keys with anyone.

🚀 <b>Get Started:</b>
Use /balance to connect your Binance account and start tracking!

Happy trading! 💰
  `;

  return welcomeText;
};
