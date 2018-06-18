# bitmex-adaptive-limit
## Purpose
Allows making a market maker limit order that would automatically up your bids or decrease your asks to guarantee fast rebateable orders.
## Installation & setup
1. Setup `BITMEX_API_KEY_ID` and `BITMEX_API_KEY_SECRET` env variables to bitmex api key and secret.
2. Optionally change `BITMEX_CONTRACT` to a different contract name, by default it's `XBTUSD`.
3. Optionally change `BITMEX_TESTNET` to `true`.
4. npm install -g bitmex-adaptive-limit
## Usage
1. `bitmex buy 3000`
1. `bitmex sell 4000`
