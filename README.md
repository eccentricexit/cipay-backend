# Backend

This service takes a meta transaction (transfering ETH from user to the service) + PIX qrcode and pays the QR Code.

## Pre-requisites

- We recommend [Volta](https://volta.sh/) for managing javascript tooling and specify the nodejs version in `volta.node` field inside `package.json`.

- Docker

## Running

### Development

1. `docker-compose up -d mongo.cipay`
2. `yarn start`