import * as dotenv from 'dotenv';
import express from 'express';
import expressWs from 'express-ws';

dotenv.config({ path: '.env' });
const { app } = expressWs(express());

const connections = new Set();

app.ws('/pay', (ws) => {
  connections.add(ws);

  ws.addEventListener('open', () => {
    console.info(`Got connection opened`);
  });

  ws.addEventListener('message', (event) => {
    console.info('Got message', event.data);
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
