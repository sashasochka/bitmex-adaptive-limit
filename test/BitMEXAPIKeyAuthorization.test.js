const assert = require('assert');
const crypto = require('crypto');
const BitMEXAPIKeyAuthorization = require('../lib/BitMEXApiKeyAuthorization');

const apiKey = 'testKey';
const apiSecret = 'testSecret';
const fixedTime = 1500000000000; // deterministic time

const auth = new BitMEXAPIKeyAuthorization(apiKey, apiSecret);

const originalNow = Date.now;
Date.now = () => fixedTime;

const request = {
  url: 'https://www.example.com/api/test?foo=bar',
  method: 'GET',
  headers: {},
  body: ''
};

auth.apply(request);

const expectedNonce = fixedTime * 1000; // nonceCounter starts at 0
const path = '/api/test?foo=bar';
const expectedSignature = crypto
  .createHmac('sha256', apiSecret)
  .update('GET' + path + expectedNonce)
  .digest('hex');

assert.strictEqual(request.headers['api-key'], apiKey);
assert.strictEqual(request.headers['api-nonce'], expectedNonce);
assert.strictEqual(request.headers['api-signature'], expectedSignature);

Date.now = originalNow;
console.log('BitMEXAPIKeyAuthorization.apply sets api-signature correctly');

