import starkbank from 'starkbank';
import logger from '../logger';

const args = {
  environment: process.env.NODE_ENV,
  id: process.env.PROJECT_ID,
  privateKey: process.env.SEC256K1_PRIVATE_KEY
};
logger.info('starkbank args', args);
starkbank.user = new starkbank.Project(args);

export default starkbank;
