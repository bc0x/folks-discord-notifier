"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_1 = __importDefault(require("./lib/discord"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const indexer_1 = __importDefault(require("./lib/indexer"));
const helpers_1 = require("./lib/helpers");
const src_1 = require("folks-finance-js-sdk/src");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
discord_1.default.once('ready', () => {
    discord_1.default.login(process.env.DISCORD_BOT_TOKEN);
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    while (true) {
        console.log('running');
        // await triggerNotifications();
        yield new Promise((resolve) => setTimeout(resolve, 1000 * 5));
    }
}))();
function triggerNotifications() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbLoans = yield prisma_1.default.loanNotification.findMany({
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
            const loanInfo = yield (0, src_1.getLoanInfo)(indexer_1.default, tokenPair, src_1.MainnetOracle, dbLoan.escrowAddress);
            var shouldNotifyDate = new Date();
            shouldNotifyDate.setDate(shouldNotifyDate.getDate() - 1);
            if ((0, helpers_1.BigIntToNumber)(loanInfo.healthFactor, 14) < dbLoan.notifyHealthFactor &&
                (dbLoan.notifiedAt === null || (dbLoan === null || dbLoan === void 0 ? void 0 : dbLoan.notifiedAt) < shouldNotifyDate)) {
                const account = yield prisma_1.default.account.findFirst({
                    where: {
                        user: { id: dbLoan.user.id },
                    },
                });
                const user = yield discord_1.default.users.fetch(account === null || account === void 0 ? void 0 : account.providerAccountId);
                const msg = `Hey there, you're at risk of getting liquidated: ${dbLoan.pair} health at ${(0, helpers_1.BigIntToNumber)(loanInfo.healthFactor, 14)}`;
                user.send(msg).catch((e) => console.log(e));
                yield prisma_1.default.loanNotification.update({
                    where: {
                        id: dbLoan.id,
                    },
                    data: {
                        notifiedAt: new Date().toISOString(),
                    },
                });
            }
        }
    });
}
