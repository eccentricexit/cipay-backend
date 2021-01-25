import { ethers } from 'ethers';

export const ACCEPTED_TOKEN_ADDRESSES = (JSON.parse(
  process.env.ACCEPTED_TOKEN_ADDRESSES,
) as string[]).map((address) => ethers.utils.getAddress(address));
export const EXCHANGE_RATES = JSON.parse(process.env.EXCHANGE_RATES);
export const DECIMAL_PLACES = JSON.parse(process.env.DECIMAL_PLACES);
export const tokenAddrToIndex = ACCEPTED_TOKEN_ADDRESSES.reduce(
  (acc, curr, i) => ({ ...acc, [curr]: i }),
  {},
);
