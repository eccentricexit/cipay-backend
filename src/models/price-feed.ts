import fetch from 'node-fetch'

export default class PriceFeed {
  private ethPriceBRL;

  constructor() {
    fetch('https://www.mercadobitcoin.net/api/ETH/ticker/')
      .then(r => this.ethPriceBRL = r.last)

    setInterval(async () => {
      // TODO: Poll bitcointrade, mercado bitcoin, foxbit
      this.ethPriceBRL =
        Math.ceil(Number((await fetch('https://www.mercadobitcoin.net/api/ETH/ticker/')).last) * 100)

    }, 5000)
  }

  getETHPriceBRL(): number {
    return this.ethPriceBRL
  }
}