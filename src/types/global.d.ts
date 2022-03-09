declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'sandbox' | 'production';
    SERVER_PORT: string;
    PAYMENT_LIMIT: string;

    // Web3
    CONFIRMATIONS_REQUIRED: string;
    JSON_RPC_ENDPOINT: string;
    WALLET_ADDRESS: string;
    META_TX_PROXY_ADDRESS: string;
    RELAYER_PRIVATE_KEY: string;
    ACCEPTED_TOKENS: string;
    BRL_TOKEN: string;
    DECIMAL_PLACES: string;
    BASE_FEE_BRL_CENTS: string;
    TOKEN_SYMBOLS: string;
    CIPAY_FEE_PCT: string;

    // Starkbank
    TAX_ID: string;
    STARK_BANK_API_URL: string;
    PROJECT_ID: string;
    STARKBANK_PUBLIC_KEY: string;
    SEC256K1_PRIVATE_KEY: string;

    HOME_URL: string;

    MONGO_URL: string;

    PAYMENT_ENGINES_DELAY_MILLISECONDS: string;
  }
}
