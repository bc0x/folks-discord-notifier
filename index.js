const discord = require('./lib/discord');
const prisma = require('./lib/prisma');
const indexer = require('./lib/indexer');
const { BigIntToNumber } = require('./lib/helpers');
const {
  getLoanInfo,
  MainnetOracle,
} = require('./lib/folks-finance-js-sdk/dist');
require('dotenv').config();

console.log('*** BOT RUNNING ***');
discord.login(process.env.DISCORD_BOT_TOKEN);

(async () => {
  while (true) {
    const t = await triggerNotifications();
    console.log('*** Triggering Notifications Result ***', t);
    await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 15)); // 15 minutes
  }
})();

async function triggerNotifications() {
  console.log('*** Triggering Notifications ***');
  try {
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
      console.log('Loan info received for', dbLoan.escrowAddress);
      var shouldNotifyDate = new Date();
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
  } catch (e) {
    console.log('*** ERROR ***');
    console.log(e);
    return false;
  }

  return true;
}
