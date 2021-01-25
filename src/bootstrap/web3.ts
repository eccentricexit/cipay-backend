import { ethers } from 'ethers';
import erc20ABI from '../abis/erc20.json';

export default ethers.getDefaultProvider(process.env.NETWORK, {
  alchemy: process.env.ALCHEMY_KEY,
  etherscan: process.env.ETHERSCAN_KEY,
  infura: process.env.INFURA_PROJECT_ID,
});

export const erc20Interface = new ethers.utils.Interface(erc20ABI);
