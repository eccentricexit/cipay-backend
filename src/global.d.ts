declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_ENV: 'sandbox' | 'production';
    SEC256K1_PRIVATE_KEY: string;
    PROJECT_ID: string;
    SERVER_PORT: string;
  }
}
