import discord from './lib/discord';
import prisma from './lib/prisma';
import indexer from './lib/indexer';
import { BigIntToNumber } from './lib/helpers';
import {
  getLoanInfo,
  MainnetOracle,
  Pool,
  TokenPair,
} from 'folks-finance-js-sdk';
import dontenv from 'dotenv';
dontenv.config();

console.log('*** NOTIFICATION BOT RUNNING ***');
discord.login(process.env.DISCORD_BOT_TOKEN);
let interval: NodeJS.Timer | null;

async function start() {
  interval = setInterval(async () => {
    const t = await triggerNotifications();
    console.log('*** Triggering Notifications Result ***', t);
  }, 1000 * 60 * 5); // 5 minutes
}

function stop() {
  if (interval === null) return;
  clearInterval(interval);
  interval = null;
}

async function triggerNotifications() {
  console.log('*** Triggering Notifications ***');
  try {
    const dbLoans = await prisma.loanNotification.findMany({
      include: {
        user: true,
      },
    });
    for (const dbLoan of dbLoans) {
      const tokenPair: TokenPair = {
        appId: dbLoan.appId,
        collateralPool: dbLoan.collateralPool as unknown as Pool,
        borrowPool: dbLoan.borrowPool as unknown as Pool,
        linkAddr: dbLoan.linkAddr,
      };
      const loanInfo = await getLoanInfo(
        indexer,
        tokenPair,
        MainnetOracle,
        dbLoan.escrowAddress
      );
      console.log('Loan info received for', dbLoan.escrowAddress);
      let shouldNotifyDate = new Date();
      shouldNotifyDate.setDate(shouldNotifyDate.getDate() - 1);
      if (
        BigIntToNumber(loanInfo.healthFactor, 14) < dbLoan.notifyHealthFactor &&
        (dbLoan.notifiedAt === null || dbLoan?.notifiedAt < shouldNotifyDate)
      ) {
        console.log('Notifiying: ', dbLoan.escrowAddress);
        const account = await prisma.account.findFirst({
          where: {
            user: { id: dbLoan.user.id },
          },
        });
        const user = await discord.users.fetch(
          account?.providerAccountId as string
        );
        const msg = `Hey there, you're at risk of getting liquidated: ${
          dbLoan.pair
        } health at ${BigIntToNumber(loanInfo.healthFactor, 14)}`;
        user.send(msg).catch((e) => console.log(e));
        await prisma.loanNotification.update({
          where: {
            id: dbLoan.id,
          },
          data: {
            notifiedAt: new Date().toISOString(),
          },
        });
      }
    }
  } catch (e) {
    console.log('*** ERROR ***');
    console.log(e);
    return false;
  }

  return true;
}

start();
