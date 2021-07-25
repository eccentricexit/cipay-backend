import { ethers } from 'ethers';

export default new ethers.providers.JsonRpcProvider(
  process.env.OPTIMSIM_GATEWAY
);
