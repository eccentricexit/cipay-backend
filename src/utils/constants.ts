import { ethers } from 'ethers';

export const OPTIMISM_ACCEPTED_TOKENS = process.env.OPTIMISM_ACCEPTED_TOKENS.split(
  ','
).map((address) => ethers.utils.getAddress(address));
export const BRL_TOKEN_EXCHANGE_RATES = process.env.BRL_TOKEN_EXCHANGE_RATES.split(
  ','
).map((er) => Number(er));
export const DECIMAL_PLACES = process.env.DECIMAL_PLACES.split(',').map((d) =>
  Number(d)
);
export const TOKEN_SYMBOLS = process.env.TOKEN_SYMBOLS.split(',').map((d) =>
  Number(d)
);
export const tokenAddrToIndex = OPTIMISM_ACCEPTED_TOKENS.reduce(
  (acc, curr, i) => ({ ...acc, [curr]: i }),
  {}
);
export const tokenAddrToRate = OPTIMISM_ACCEPTED_TOKENS.reduce(
  (acc, curr, i) => ({ ...acc, [curr]: BRL_TOKEN_EXCHANGE_RATES[i] }),
  {}
);
export const tokenAddrToDecimals = OPTIMISM_ACCEPTED_TOKENS.reduce(
  (acc, curr, i) => ({ ...acc, [curr]: DECIMAL_PLACES[i] }),
  {}
);
export const tokenAddrToSymbol = OPTIMISM_ACCEPTED_TOKENS.reduce(
  (acc, curr, i) => ({ ...acc, [curr]: TOKEN_SYMBOLS[i] }),
  {}
);
