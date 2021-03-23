# DEPRECATED SEE MONOREPO FOR NEW ARCHITECTURE

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

> TODO: Run the following queries automatically when `docker-compose up` is called.

```
CREATE
  STREAM IF NOT EXISTS
    PAYMENT_REQUESTS_STREAM
      (ID STRING, TXHASH STRING, BRCODE STRING, AMOUNT INTEGER, FROMADDRESS STRING, STATUS STRING)
    WITH
      (KAFKA_TOPIC='payment_requests', KEY_FORMAT='KAFKA', PARTITIONS=1, REPLICAS=1, VALUE_FORMAT='JSON');

CREATE
  TABLE IF NOT EXISTS
    payment_requests_table
  AS
    SELECT
      id,
      LATEST_BY_OFFSET(txHash) AS txHash,
      LATEST_BY_OFFSET(brcode) AS brcode,
      LATEST_BY_OFFSET(amount) AS amount,
      LATEST_BY_OFFSET(fromAddress) AS fromAddress,
      LATEST_BY_OFFSET(status) AS status
  FROM
    payment_requests_stream
  GROUP BY id
  EMIT CHANGES;
```
