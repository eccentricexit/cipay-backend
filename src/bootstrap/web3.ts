import { ethers } from 'ethers';

export default ethers.getDefaultProvider(process.env.NETWORK, {
  alchemy: process.env.ALCHEMY_KEY,
  etherscan: process.env.ETHERSCAN_KEY,
  infura: process.env.INFURA_PROJECT_ID,
});
