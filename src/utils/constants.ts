import { ethers } from 'ethers';

export const ACCEPTED_TOKEN_ADDRESSES = process.env.ACCEPTED_TOKEN_ADDRESSES.split(
  ',',
).map((address) => ethers.utils.getAddress(address));
export const EXCHANGE_RATES = process.env.EXCHANGE_RATES.split(',').map((er) =>
  Number(er),
);
export const DECIMAL_PLACES = process.env.DECIMAL_PLACES.split(',').map((d) =>
  Number(d),
);
export const tokenAddrToIndex = ACCEPTED_TOKEN_ADDRESSES.reduce(
  (acc, curr, i) => ({ ...acc, [curr]: i }),
  {},
);
