#!/usr/bin/env node
'use strict';

// Modules
const SwaggerClient = require('swagger-client');
const assert = require('assert');
const BitMEXAPIKeyAuthorization = require('./lib/BitMEXAPIKeyAuthorization');
const BitMEXWSClient = require('bitmex-realtime-api');

// Globals
const testnet = process.env.BITMEX_TESTNET === "true";
const websitePrefix = testnet ? 'testnet' : 'www';
const symbol = process.env.BITMEX_CONTRACT || 'XBTUSD';

// Command line: two args, first is Buy or Sell, second is number of contracts.
assert(process.argv.length == 4);

const capitalizeFirstLetter = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const side = capitalizeFirstLetter(process.argv[2]);
const orderQty = parseInt(process.argv[3], 10);

assert(side == 'Buy' || side == 'Sell');
assert(orderQty != NaN);

// 1s delayer/waiter to avoid api request limit.
let needToWait = false;
let waitPeriodTimeout;
const requestWaitPeriod = () => {
  needToWait = true;
  if (waitPeriodTimeout) clearTimeout(waitPeriodTimeout);
  waitPeriodTimeout = setTimeout(() => {
    needToWait = false;
    amendPrice();
  }, 1000)
};

let lastPrice;
const firstPrice = new Promise((resolve, reject) => {
  let isFirstPrice = true;
  new BitMEXWSClient({testnet}).addStream(symbol, 'quote', data => {
    if (!data || data.length == 0)
    {
      console.log('Websocket returning undefined data');
      reject();
    }
    assert(data[data.length - 1], `WS data length is ${data.length}`);
    assert(data[data.length - 1].bidPrice, 'WS data has no bidPrice');
    const {bidPrice, askPrice} = data[data.length - 1];

    if (side == "Buy") lastPrice = Math.min(bidPrice + 0.5, askPrice - 0.5);
    else lastPrice = Math.max(bidPrice + 0.5, askPrice - 0.5);

    if (isFirstPrice) {
      resolve(lastPrice);
      isFirstPrice = false;
    }
    else {
      amendPrice();
    }
  });
});

// Create initial order.
let orderID;
let currentOrderPrice;

const clientPromise = new SwaggerClient({
  url: `https://${websitePrefix}.bitmex.com/api/explorer/swagger.json`,
  usePromise: true
});
clientPromise.then(async client => {
  client.clientAuthorizations.add('apiKey', new BitMEXAPIKeyAuthorization(process.env.BITMEX_API_KEY_ID, process.env.BITMEX_API_KEY_SECRET));

  currentOrderPrice = await firstPrice;
  console.log(`Creating order with price: ${currentOrderPrice}`);
  orderID = (await client.Order.Order_new({symbol, price: currentOrderPrice, orderQty, side, execInsts: 'ParticipateDoNotInitiate'})).obj.orderID;
})
.catch(e =>
   console.error(`Error (unable to connect?): ${e.errObj.message}`)
);

const amendPrice = async () => {
  if (needToWait) return;
  needToWait = true;

  if (lastPrice != currentOrderPrice)
  {
    currentOrderPrice = lastPrice;
    const client = await clientPromise;
    await client.Order.Order_amend({orderID, price: lastPrice})
      .then(() => {
        console.log(`Order amended with new price: ${currentOrderPrice}`);
        requestWaitPeriod();
      })
      .catch(e => {
        if (e.obj.error.message == "Invalid ordStatus")
        {
          console.log('Order executed successfully.');
          process.exit(0);
        }
        else
        {
          console.error(e.message);
          process.exit(1);
        }
      });
  }
  else
  {
    requestWaitPeriod();
  }
};