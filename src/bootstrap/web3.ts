import { ethers } from 'ethers';

export const optimismProvider = new ethers.providers.JsonRpcProvider(
  process.env.OPTIMSIM_GATEWAY
);

export const arbitrumProvider = new ethers.providers.JsonRpcProvider(
  process.env.ARBITRUM_GATEWAY
);
