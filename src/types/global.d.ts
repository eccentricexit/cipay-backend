declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'sandbox' | 'production';
    SERVER_PORT: string;
    PAYMENT_LIMIT: string;

    // Web3
    JSON_RPC_ENDPOINT: string;
    WALLET_ADDRESS: string;
    ACCEPTED_TOKEN_ADDRESSES: string;
    BRL_TOKEN_EXCHANGE_RATES: string;
    DECIMAL_PLACES: string;
    CONFIRMATIONS_REQUIRED: string;
    META_TX_PROXY_ADDRESS: string;
    RELAYER_PRIVATE_KEY: string;
    BASE_FEE_BRL: number;

    // Starkbank
    TAX_ID: string;
    DOMAIN: string;
    PROJECT_ID: string;
    STARKBANK_PUBLIC_KEY: string;
    SEC256K1_PRIVATE_KEY: string;
  }
}
