import discord from './lib/discord';
import prisma from './lib/prisma';
import indexer from './lib/indexer';
import { BigIntToNumber } from './lib/helpers';
import { getLoanInfo, MainnetOracle } from 'folks-finance-js-sdk/dist';
import dotenv from 'dotenv';

dotenv.config();
discord.once('ready', () => {
  discord.login(process.env.DISCORD_BOT_TOKEN);
});

(async () => {
  while (true) {
    console.log('running');
    // await triggerNotifications();
    await new Promise((resolve) => setTimeout(resolve, 1000 * 5));
  }
})();

async function triggerNotifications() {
  const dbLoans = await prisma.loanNotification.findMany({
    include: {
      user: true,
    },
  });
  for (const dbLoan of dbLoans) {
    const tokenPair = {
      appId: dbLoan.appId,
      collateralPool: dbLoan.collateralPool,
      borrowPool: dbLoan.borrowPool,
      linkAddr: dbLoan.linkAddr,
    };
    const loanInfo = await getLoanInfo(
      indexer,
      tokenPair,
      MainnetOracle,
      dbLoan.escrowAddress
    );
    var shouldNotifyDate = new Date();
    shouldNotifyDate.setDate(shouldNotifyDate.getDate() - 1);
    if (
      BigIntToNumber(loanInfo.healthFactor, 14) < dbLoan.notifyHealthFactor &&
      (dbLoan.notifiedAt === null || dbLoan?.notifiedAt < shouldNotifyDate)
    ) {
      const account = await prisma.account.findFirst({
        where: {
          user: { id: dbLoan.user.id },
        },
      });
      const user = await discord.users.fetch(account?.providerAccountId);
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
}
