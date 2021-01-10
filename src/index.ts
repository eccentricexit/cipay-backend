import * as dotenv from 'dotenv';
import express from 'express';
import expressWs from 'express-ws';
import { ethers } from 'ethers';
import starkbank from 'starkbank';
import delay from 'delay';

dotenv.config({ path: '.env' });
const { app } = expressWs(express());

starkbank.user = new starkbank.Project({
  environment: process.env.NODE_ENV,
  id: process.env.PROJECT_ID,
  privateKey: process.env.SEC256K1_PRIVATE_KEY,
});

const provider = ethers.getDefaultProvider(process.env.NETWORK, {
  alchemy: process.env.ALCHEMY_KEY,
  etherscan: process.env.ETHERSCAN_KEY,
  infura: process.env.INFURA_PROJECT_ID,
});
const taxId = process.env.TAX_ID;

const connections = new Set();
app.ws('/pay', (ws) => {
  connections.add(ws);

  ws.addEventListener('open', () => {
    console.info(`Got connection opened`);
  });

  ws.addEventListener('message', (event) => {
    (async () => {
      try {
        const { txHash, qrCode } = JSON.parse(event.data);
        console.info(`Got payment request.`);
        console.info(`TxHash: ${txHash}`);
        console.info(`qrCode: ${qrCode}`);
        console.info('');
        // TODO: Check if this txHash was already used in
        // another payment.

        console.info('Waiting for confirmation...');
        await provider.waitForTransaction(txHash, 1); // TODO: Update this to use OVM.
        console.info('Tx Confirmed. Creating payment...');
        // TODO: Mark as used.
        // TODO: Check amount.

        const { id: starkPaymentID } = (
          await starkbank.brcodePayment.create([
            {
              taxId,
              brcode: qrCode,
              description: 'Cipay payment',
              tags: ['cipay', 'pix', 'qrcode'],
            },
          ])
        )[0];
        console.info(
          `Payment created: ${starkPaymentID}. Waiting for payment execution.`,
        );
        console.info('');

        let process = true;
        while (process) {
          await delay(300);
          const response = await starkbank.brcodePayment.get(starkPaymentID);
          console.info(response);
          const { status } = response;
          console.info(`Checking status... ${status}`);
          switch (status) {
            case 'created':
            case 'processing':
              continue;
            case 'success':
              process = false;
              break;
            default: {
              // TODO: Return crypto to user.
              const log = await starkbank.brcodePayment.log.get(starkPaymentID);
              console.log(log);
              throw new Error('Payment failed.');
            }
          }
        }

        console.info('SUCCESS! MOTHERFUCKER.');
        ws.send(JSON.stringify({ message: 'success' }));
      } catch (error) {
        console.error(error);
        ws.send(JSON.stringify({ message: 'error', error }));
      }
    })();
  });

  ws.addEventListener('error', () => {
    console.error('Error in websocket');
  });

  ws.addEventListener('close', (event) => {
    console.info('Closed ws connection:', event.code, event.reason);
    connections.delete(ws);
  });
});

// start the server, listening to port 8080
app.listen(process.env.SERVER_PORT);
console.info('Server listening on PORT', process.env.SERVER_PORT);
