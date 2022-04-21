// lib/indexer.ts
import { Indexer } from 'algosdk';

let indexer: Indexer;

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

export default indexer;
