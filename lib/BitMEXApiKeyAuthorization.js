'use strict';
const _ = require('lodash');
const crypto = require('crypto');
const url = require('url');

/**
 * Handles HMAC signing for BitMEX API keys.
 */
let nonceCounter = 0;

class BitMEXAPIKeyAuthorization {
  constructor (apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  apply(obj) {
    const nonce = Date.now() * 1000 + (nonceCounter++ % 1000); // Prevents colliding nonces; alternatively set the 'api-expires' header.
    const expires = (Date.now() / 1000) + 60; // 60s till expiration
    const parsedURL = url.parse(obj.url);
    const thisPath = parsedURL.pathname + (parsedURL.search || '');
    const signature = this.sign(obj.method.toUpperCase(), thisPath, nonce, obj.body);
    obj.headers['api-key'] = this.apiKey;
    // Alternatively, omit this and set 'api-expires' to a unix time in the future.
    // obj.headers['api-expires'] = expires; // expires in 5s
    obj.headers['api-nonce'] = nonce;
    obj.headers['api-signature'] = signature;
    return true;
  };
  
  sign(verb, url, nonce, data) {
    if (!data || _.isEmpty(data)) data = '';
    else if (_.isObject(data)) data = JSON.stringify(data);
  
    return crypto.createHmac('sha256', this.apiSecret).update(verb + url + nonce + data).digest('hex');
  };
} 

module.exports = BitMEXAPIKeyAuthorization;
