# Backend

This service takes a signature (transfering DAI from user to cipay) + PIX qrcode and pays the QR Code.

It uses [krakenjs](), an express framework.

## Pre-requisites

- We recommend [Volta](https://volta.sh/) for managing javascript tooling and specify the nodejs version in `volta.node` field inside `package.json`.

## Development

0- Run `npm install` after setting up the pre-requisites.
1- Start boot ksqlDB with `docker-compose up`;
2- Run `npm run start`.

Accessing the ksqlDB CLI: `docker exec -it ksqldb-cli ksql http://ksqldb-server:8088`
