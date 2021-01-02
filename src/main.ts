import * as dotenv from 'dotenv';
import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';

const NODE_ENV = process.env.NODE_ENV;
let dotEnvFilename: string;
switch (NODE_ENV) {
  case 'sandbox':
    dotEnvFilename = '.env.sandbox';
    break;
  case 'production':
    dotEnvFilename = '.env.production';
    break;
  default:
    throw new Error(`Invalid NODE_ENV=${NODE_ENV}.`);
}
dotenv.config({ path: `${__dirname}/${dotEnvFilename}` });

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', (message: string) => {
    console.log('received: %s', message);
    ws.send(`Hello, you sent -> ${message}`);
  });

  ws.send('Hi there, I am a WebSocket server');
});

server.listen(process.env.SERVER_PORT, () => {
  console.log(`Server started on port ${process.env.SERVER_PORT} :)`);
});
