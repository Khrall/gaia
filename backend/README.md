# Gaia Backend

## Development

```
npm install -g tsc
yarn
cp .sample.env .env
yarn run watch
```

## Production

```
npm install -g tsc
npm install
cp .sample.env .env

# Modify .env 

tsc
node dist/index.js
```
