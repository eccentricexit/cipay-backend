import { ethers } from 'ethers';

console.info('jsonrpc endpoint', process.env.JSON_RPC_ENDPOINT);
export default new ethers.providers.JsonRpcProvider(
  process.env.JSON_RPC_ENDPOINT
);
