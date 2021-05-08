# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.1.0 (2021-05-08)


### Features

* add dockerized postgresql ([39dcc4f](https://github.com/mtsalenc/cipay-backend/commit/39dcc4f04d793df06adc613897494f7ef3d8e5c7))
* add endpoint to fetch token amount, generate invoice ([92f57ff](https://github.com/mtsalenc/cipay-backend/commit/92f57ff90955259cec051f7161216a3b72a57ae0))
* add helmet and refactor ([2ce0a52](https://github.com/mtsalenc/cipay-backend/commit/2ce0a52d329e86b53ac65fa79e12eda6c22d324f))
* add kafkajs and webhook hadling ([67ca0e6](https://github.com/mtsalenc/cipay-backend/commit/67ca0e670139792a4b09f1f6724c5fa0869e08c0))
* add mongodb, cleanup code and validate requests ([d9ea56b](https://github.com/mtsalenc/cipay-backend/commit/d9ea56b75c12b437b2ba6d5885e6fb8b0be628c4))
* add rate limiting ([7f59f95](https://github.com/mtsalenc/cipay-backend/commit/7f59f95e2eeb041da1c3df3156daab60619f0bdb))
* add starkbank webhook ([d953a75](https://github.com/mtsalenc/cipay-backend/commit/d953a754bca6fac41327c8d1aabbf47d9d5e7535))
* add status endpoint ([a2aa722](https://github.com/mtsalenc/cipay-backend/commit/a2aa7227239ebe836547a32caf29385c6ed9eee0))
* add ws connection handling ([c4e5596](https://github.com/mtsalenc/cipay-backend/commit/c4e55963a2c69d25d1f1d76ae95e2edac878870f))
* dockerize backend ([cb234e7](https://github.com/mtsalenc/cipay-backend/commit/cb234e7546e4b50e31548fc7c1245d421b316c0e))
* emit webhook data ([a4ebc73](https://github.com/mtsalenc/cipay-backend/commit/a4ebc73238282ce8f974586c6d2ffb69cbebb2e5))
* execute tx ([dd8f2dc](https://github.com/mtsalenc/cipay-backend/commit/dd8f2dc9c793579e94b7f80bbcbaee4c2fa4f314))
* implement brcode-payment route ([0b8f1ae](https://github.com/mtsalenc/cipay-backend/commit/0b8f1ae42cc0db8ee6d8174b3f0da72fe40986b9))
* implement payment status endpoint ([2041b42](https://github.com/mtsalenc/cipay-backend/commit/2041b42e4ba9e79762d25153ee4f918c10342c83))
* implement request-payment ([78fce24](https://github.com/mtsalenc/cipay-backend/commit/78fce24d3f4be42f5db4c03549d04f1c1a51c590))
* move to kovan l2 ([4634d17](https://github.com/mtsalenc/cipay-backend/commit/4634d178cdd500fcc17fa96f04779d69fb4059b0))
* re-add server ([cd05d76](https://github.com/mtsalenc/cipay-backend/commit/cd05d7691478bba130d0f4dba59b58ec3a35d20a))
* return token info in amount required ([8621f97](https://github.com/mtsalenc/cipay-backend/commit/8621f97914a4a847baf2b39ed51aebc2ceb0cf7f))
* send back on payment-request ([2a92e86](https://github.com/mtsalenc/cipay-backend/commit/2a92e862c52c520ee42b6a87f2dfefbf65438131))
* setup ksqlDB ([db0daf3](https://github.com/mtsalenc/cipay-backend/commit/db0daf31295e6a4e6667231b529d4e73c43c12ba))
* slow down payment-request engine ([cea06df](https://github.com/mtsalenc/cipay-backend/commit/cea06df546ae05eb5eb3cbea72e6cfbeffdf453b))
* watch tx and pay ([108dca9](https://github.com/mtsalenc/cipay-backend/commit/108dca9bbed543e21ef0467605a4bc966b8a3b6f))


### Bug Fixes

* broken flow handle ([d7cbd36](https://github.com/mtsalenc/cipay-backend/commit/d7cbd3670d13e6cb82ee8b674dbd752d851e1f8a))
* hardcoded values in endpoint ([18e25ae](https://github.com/mtsalenc/cipay-backend/commit/18e25aef8ab34c04c9a75f2ba8796a51f3729928))
* id computation and query response handling ([24824cc](https://github.com/mtsalenc/cipay-backend/commit/24824cc34ceb6b0c5a0045df090cdcfd0dd9d1c6))
* incorrect env variable name ([0b01b52](https://github.com/mtsalenc/cipay-backend/commit/0b01b52af370785920a8b33d4e8484c6476f5957))
* parameter list ([3fac9ed](https://github.com/mtsalenc/cipay-backend/commit/3fac9edabebe207843a2859471784672db84dcc7))
* payment status ([0c471d2](https://github.com/mtsalenc/cipay-backend/commit/0c471d214a0202055145e57ae322be545d78205e))
* verify destination address earlier ([5b7e44b](https://github.com/mtsalenc/cipay-backend/commit/5b7e44b3b6154f218a4101535fe6d716571b4725))
