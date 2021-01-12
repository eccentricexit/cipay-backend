declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'sandbox' | 'production';
    SEC256K1_PRIVATE_KEY: string;
    PROJECT_ID: string;
    SERVER_PORT: string;
    ALCHEMY_KEY: string;
    ETHERSCAN_KEY: string;
    INFURA_PROJECT_ID: string;
    NETWORK: string;
    TAX_ID: string;
    DOMAIN: string;
  }
}
