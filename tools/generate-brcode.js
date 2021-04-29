const starkbank = require('starkbank');

starkbank.user = new starkbank.Project({
  environment: process.env.NODE_ENV,
  id: process.env.PROJECT_ID,
  privateKey: process.env.SEC256K1_PRIVATE_KEY,
});

;(async () => {
  const invoices = await starkbank.invoice.create([{
    amount: 5,
    taxId: '012.345.678-90',
    name: 'Jon Snow',
  }]);

  for (let invoice of invoices) {
    console.log(invoice);
  }
})()