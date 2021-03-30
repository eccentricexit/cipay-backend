import { ethers } from 'ethers';

export default new ethers.providers.JsonRpcProvider(
  process.env.JSON_RPC_ENDPOINT,
);
