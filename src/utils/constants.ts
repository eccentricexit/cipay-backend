import { ethers } from 'ethers';

export const ARBITRUM_ACCEPTED_TOKENS = process.env.ARBITRUM_ACCEPTED_TOKENS.split(
  ','
).map((address) => ethers.utils.getAddress(address));
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

export const chainInfo = {
  1: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    shortName: 'eth',
    networkId: 1,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpc: [
      'https://mainnet.infura.io/v3/${INFURA_API_KEY}',
      'wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}',
      'https://api.mycryptoapi.com/eth',
      'https://cloudflare-eth.com'
    ],
    faucets: [],
    infoURL: 'https://ethereum.org'
  },
  4: {
    name: 'Ethereum Testnet Rinkeby',
    chain: 'ETH',
    network: 'rinkeby',
    rpc: [
      'https://rinkeby.infura.io/v3/${INFURA_API_KEY}',
      'wss://rinkeby.infura.io/ws/v3/${INFURA_API_KEY}'
    ],
    faucets: ['https://faucet.rinkeby.io'],
    nativeCurrency: {
      name: 'Rinkeby Ether',
      symbol: 'RIN',
      decimals: 18
    },
    infoURL: 'https://www.rinkeby.io',
    shortName: 'rin',
    chainId: 4,
    networkId: 4,
    ens: {
      registry: '0xe7410170f87102df0055eb195163a03b7f2bff4a'
    },
    explorers: [
      {
        name: 'etherscan-rinkeby',
        url: 'https://rinkeby.etherscan.io',
        standard: 'EIP3091'
      }
    ]
  },
  42: {
    name: 'Ethereum Testnet Kovan',
    chain: 'ETH',
    network: 'kovan',
    rpc: [
      'https://kovan.poa.network',
      'http://kovan.poa.network:8545',
      'https://kovan.infura.io/v3/${INFURA_API_KEY}',
      'wss://kovan.infura.io/ws/v3/${INFURA_API_KEY}',
      'ws://kovan.poa.network:8546'
    ],
    faucets: [
      'https://faucet.kovan.network',
      'https://gitter.im/kovan-testnet/faucet'
    ],
    nativeCurrency: {
      name: 'Kovan Ether',
      symbol: 'KOV',
      decimals: 18
    },
    infoURL: 'https://kovan-testnet.github.io/website',
    shortName: 'kov',
    chainId: 42,
    networkId: 42
  },
  69: {
    name: 'Optimistic Ethereum Testnet Kovan',
    chain: 'ETH',
    network: 'kovan',
    rpc: ['https://kovan.optimism.io/'],
    faucets: [],
    nativeCurrency: {
      name: 'Kovan Ether',
      symbol: 'KOR',
      decimals: 18
    },
    infoURL: 'https://optimism.io',
    shortName: 'okov',
    chainId: 69,
    networkId: 69
  },
  421611: {
    name: 'Arbitrum Testnet Rinkeby',
    chainId: 421611,
    shortName: 'arb-rinkeby',
    chain: 'ETH',
    network: 'rinkeby',
    networkId: 421611,
    nativeCurrency: {
      name: 'Arbitrum Rinkeby Ether',
      symbol: 'ARETH',
      decimals: 18
    },
    rpc: ['https://rinkeby.arbitrum.io/rpc', 'wss://rinkeby.arbitrum.io/ws'],
    faucets: [],
    infoURL: 'https://arbitrum.io',
    explorers: [
      {
        name: 'arbitrum-rinkeby',
        url: 'https://rinkeby-explorer.arbitrum.io',
        standard: 'EIP3091'
      }
    ]
  }
};
