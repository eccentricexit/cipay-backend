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

### DB Bootstrap

> TODO: Add ksql.queries.file to docker-compose file.
> TODO: Materialize event stream

```
CREATE
  STREAM
    payment_requests_stream
      (id VARCHAR, txHash VARCHAR, brcode VARCHAR, amount INTEGER, fromAddress VARCHAR)
    WITH
      (kafka_topic='payment_request', value_format='JSON');
    EMIT CHANGES;

CREATE
  TABLE
    payment_requests_table
  AS
    SELECT id,txHash,brCode,amount,fromAddress
  FROM
    payment_requests_stream
  GROUP BY id
  EMIT CHANGES;
```
