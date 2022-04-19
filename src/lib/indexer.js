// lib/indexer.ts
const { Indexer } = require('algosdk');

let indexer;

if (process.env.NODE_ENV === 'production') {
  indexer = new Indexer('null', 'https://algoindexer.algoexplorerapi.io', '');
} else {
  if (!global.indexer) {
    global.indexer = new Indexer(
      'null',
      'https://algoindexer.algoexplorerapi.io',
      ''
    );
  }
  indexer = global.indexer;
}

module.exports = indexer;
