"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// lib/indexer.ts
const algosdk_1 = require("algosdk");
let indexer;
if (process.env.NODE_ENV === 'production') {
    indexer = new algosdk_1.Indexer('null', 'https://algoindexer.algoexplorerapi.io', '');
}
else {
    if (!global.indexer) {
        global.indexer = new algosdk_1.Indexer('null', 'https://algoindexer.algoexplorerapi.io', '');
    }
    indexer = global.indexer;
}
exports.default = indexer;
