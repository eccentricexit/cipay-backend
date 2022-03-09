import starkbank from 'starkbank';

const args = {
  environment: process.env.NODE_ENV,
  id: process.env.PROJECT_ID,
  privateKey: process.env.SEC256K1_PRIVATE_KEY
};

starkbank.user = new starkbank.Project(args);

export default starkbank;
