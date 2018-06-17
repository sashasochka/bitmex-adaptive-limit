// Modules
const SwaggerClient = require('swagger-client');
const assert = require('assert');
const BitMEXAPIKeyAuthorization = require('./lib/BitMEXAPIKeyAuthorization');

// Globals
const testnet = true;
const websitePrefix = testnet ? 'testnet' : 'www';
const symbol = process.env.BITMEX_CONTRACT || 'XBTUSD';

// Command line: two args, first is Buy or Sell, second is number of contracts.
assert(process.argv.length == 4);

const capitalizeFirstLetter = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const side = capitalizeFirstLetter(process.argv[2]);
const orderQty = parseInt(process.argv[3], 10);

assert(side == 'Buy' || side == 'Sell');
assert(orderQty != NaN);

// Client
new SwaggerClient({
  url: `https://${websitePrefix}.bitmex.com/api/explorer/swagger.json`,
  usePromise: true
})
.then(async client => {
  client.clientAuthorizations.add('apiKey', new BitMEXAPIKeyAuthorization(process.env.BITMEX_API_KEY_ID, process.env.BITMEX_API_KEY_SECRET));

  const getQuote = quote => side == "Buy" ? quote.obj[0].bidPrice : quote.obj[0].askPrice;

  const price = getQuote(await client.Quote.Quote_get({symbol, reverse: true, count: 1}));
  console.log(`Creating order with price: ${price}`);
  const orderID = (await client.Order.Order_new({symbol, price, orderQty, side, execInsts: 'ParticipateDoNotInitiate'})).obj.orderID;

  const launchTimer = () => setTimeout(amendPrice, 1000);

  let lastPrice = price;
  const amendPrice = async () => {
    const price = getQuote(await client.Quote.Quote_get({symbol, reverse: true, count: 1}));
    if (price != lastPrice)
    {
      lastPrice = price;
      await client.Order.Order_amend({orderID, price: price})
        .then(() => {
          console.log(`Order amended with new price: ${price}`);
          launchTimer();
        })
        .catch(e => {
          if (e.obj.error.message == "Invalid ordStatus")
          {
            console.log('Order executed successfully.');
          }
          else
          {
            console.error(e.error.message);
          }
        });
    }
    else
    {
      launchTimer();
    }
  };

  launchTimer();
})
.catch(e => console.error(`Unable to connect: ${e}`));
