This service takes a signature (transfering DAI from user to cipay) + PIX qrcode and pays the QR Code.

# Development

1- Start boot ksqlDB with `docker-compose up`;
2- Run `npm run start`.

Accessing the CLI: `docker exec -it ksqldb-cli ksql http://ksqldb-server:8088`
