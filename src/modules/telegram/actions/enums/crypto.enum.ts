export enum ECrypto {
  USDT = 'USDT',
  BSC = 'BSC',
  TRX = 'TRX',
  APT = 'APT',
  ETH = 'ETH',
  SOL = 'SOL',
  TON = 'TON',
}

export const cryptoToSymbol: Record<ECrypto, string> = {
  [ECrypto.BSC]: 'BNBUSDT', // BSC үчүн BNB
  [ECrypto.TRX]: 'TRXUSDT',
  [ECrypto.APT]: 'APTUSDT',
  [ECrypto.ETH]: 'ETHUSDT',
  [ECrypto.SOL]: 'SOLUSDT',
  [ECrypto.TON]: 'TONUSDT',
  [ECrypto.USDT]: 'APTUSDT',
};
