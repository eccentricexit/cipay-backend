declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'sandbox' | 'production';
    SERVER_PORT: string;
    PAYMENT_LIMIT: string;

    // Web3
    SEC256K1_PRIVATE_KEY: string;
    PROJECT_ID: string;
    ALCHEMY_KEY: string;
    ETHERSCAN_KEY: string;
    INFURA_PROJECT_ID: string;
    NETWORK: string;
    WALLET_ADDRESS: string;
    ACCEPTED_TOKEN_ADDRESSES: string;
    EXCHANGE_RATES: string;
    DECIMAL_PLACES: string;

    // Starkbank
    TAX_ID: string;
    DOMAIN: string;

    // KAFKA
    KAFKA_HOSTNAME: string;
    KAFKA_KSQL_PORT: string;
    KAFKA_BROKER_PORT: string;
  }
}
