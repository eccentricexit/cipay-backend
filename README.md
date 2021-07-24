> NOTES TO REVIEWERS:
 
- This is one of 3 repositories of the project, the other two being https://github.com/mtsalenc/cipay-ui and https://github.com/mtsalenc/cipay-contracts.
- I had thought about this project before the hackathon started, but it was not even close to functional and really just piling dust, I took the opportuninty to actually make it happen. The history of the project is preserved in git so you can see what each repo looked like before the hackathon started.

# Backend

This service takes a meta transaction (transfering ETH from user to the service) + PIX qrcode and pays the QR Code.

## Pre-requisites

- We recommend [Volta](https://volta.sh/) for managing javascript tooling and specify the nodejs version in `volta.node` field inside `package.json`.

- Docker

## Running

1. `docker-compose --env-file <path-to-env-file> up -d mongo.cipay`
2. `yarn start`
