import discord from './lib/discord';
import prisma from './lib/prisma';
import indexer from './lib/indexer';
import { groupTxnToLiquidation } from './lib/mapper';
import dontenv from 'dotenv';
import { MainnetTokenPairs } from 'folks-finance-js-sdk';
import { Liquidation } from '@prisma/client';
dontenv.config();
discord.login(process.env.DISCORD_BOT_TOKEN);

const DEFAULT_START_ROUND = 20533346;
const ROUND_INTERVAL = 500;
const APP_DICTIONARY = Object.entries(MainnetTokenPairs).map(([pair, data]) => {
  return {
    pair,
    appId: data.appId,
    collateralPool: data.collateralPool,
    borrowPool: data.borrowPool,
    linkAddr: data.linkAddr,
  };
});

let interval: NodeJS.Timer | null;

async function start() {
  console.log('*** BOT RUNNING ***');
  let startingRound = await getStartingRound();
  let maxRound = await getMaxRound();
  interval = setInterval(async () => {
    for (const entry of APP_DICTIONARY) {
      const { appId, collateralPool, borrowPool, pair } = entry;
      console.log(`*** ${pair} - ${startingRound} to ${maxRound} ***`);
      const liquidations = await getLiquidationTxns(
        appId as number,
        [],
        maxRound,
        startingRound
      );
      const groupTxns = await getGroupTxn(liquidations);
      const parsedData = parseGroupTxns(
        groupTxns,
        pair,
        collateralPool.assetDecimals,
        borrowPool.assetDecimals,
        maxRound
      );
      const created = await createLiquidations(parsedData);
      console.log(
        `*** ${pair} - ${parsedData.length} liqudations created, ${created} ***`
      );
    }
    startingRound = maxRound;
    maxRound = await getMaxRound();
  }, 1000 * 60 * 15); // 15 minutes
}

async function getStartingRound(): Promise<number> {
  const startingRound = await prisma.liquidation.findFirst({
    select: {
      maxRoundSearched: true,
    },
    orderBy: {
      maxRoundSearched: 'desc',
    },
  });
  return Promise.resolve(
    startingRound?.maxRoundSearched ?? DEFAULT_START_ROUND
  );
}

async function getMaxRound(): Promise<number> {
  const { round } = await indexer.makeHealthCheck().do();
  return Promise.resolve(round);
}

async function getLiquidationTxns(
  applicationId: number,
  liquidationTxns: any[],
  maxBlock: number,
  startingRound: number = DEFAULT_START_ROUND
): Promise<any[]> {
  if (startingRound < maxBlock) {
    const foundAppTxns = await indexer
      .searchForTransactions()
      .applicationID(applicationId)
      .maxRound(startingRound + ROUND_INTERVAL)
      .minRound(startingRound)
      .do();
    const txns = foundAppTxns.transactions;
    for (const txn of txns) {
      if (
        txn['application-transaction']['application-args'][0] ===
        Buffer.from('l').toString('base64')
      ) {
        console.log('*** FOUND LIQUIDATION ***');
        liquidationTxns.push(txn);
      }
    }
    return getLiquidationTxns(
      applicationId,
      liquidationTxns,
      maxBlock,
      startingRound + ROUND_INTERVAL
    );
  }

  return Promise.resolve(liquidationTxns);
}

async function getGroupTxn(txns: any[]): Promise<any[]> {
  const groupTxns = [];
  for (const txn of txns) {
    const blockData = await indexer.lookupBlock(txn['confirmed-round']).do();
    const groupTxn = blockData.transactions.filter(
      (bt: any) =>
        bt.group === txn.group &&
        (bt['inner-txns'] || bt['tx-type'] === 'axfer')
    );
    groupTxns.push(groupTxn);
  }

  return groupTxns;
}

function parseGroupTxns(
  groupTxns: any[][],
  pair: string,
  collateralPoolAssetDecimals: number,
  borrowPoolAssetDecimals: number,
  maxRoundSearched: number
): Liquidation[] {
  return groupTxns.map((groupTxn) =>
    groupTxnToLiquidation(
      groupTxn,
      pair,
      collateralPoolAssetDecimals,
      borrowPoolAssetDecimals,
      maxRoundSearched
    )
  );
}

async function createLiquidations(
  liquidations: Liquidation[]
): Promise<boolean> {
  const t = await prisma.liquidation.createMany({
    data: liquidations,
  });
  return Promise.resolve(t.count === liquidations.length);
}

function stop() {
  if (interval === null) return;
  clearInterval(interval);
  interval = null;
  console.log('*** BOT STOPPED ***');
}

start();
