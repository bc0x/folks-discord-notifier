import { Liquidation } from '@prisma/client';
import { BigIntToNumber } from './helpers';

export function groupTxnToLiquidation(
  groupTxn: any[],
  pair: string,
  collateralPoolAssetDecimals: number,
  borrowPoolAssetDecimals: number,
  maxRoundSearched: number
): Liquidation {
  return groupTxn.reduce((acc, txn) => {
    switch (txn['tx-type']) {
      case 'axfer': {
        acc.group = txn.group;
        acc.liquidatorWallet = txn['sender'];
        acc.amountPaid = BigIntToNumber(
          txn['asset-transfer-transaction']['amount'],
          borrowPoolAssetDecimals
        );
        acc.amountPaidAssetId = txn['asset-transfer-transaction']['asset-id'];
        break;
      }
      case 'appl': {
        const innerTxns: any[] = txn['inner-txns'];
        if (innerTxns.length === 1) {
          acc.collateralReceived = BigIntToNumber(
            innerTxns[0]['asset-transfer-transaction']['amount'],
            collateralPoolAssetDecimals
          );
          acc.collateralReceivedAssetId =
            innerTxns[0]['asset-transfer-transaction']['asset-id'];
        }
        break;
      }
      default:
        break;
    }
    const [collateral, borrow] = pair.split('-');
    acc.pair = pair;
    acc.collateral = collateral;
    acc.borrow = borrow;
    acc.maxRoundSearched = maxRoundSearched;
    return acc;
  }, {});
}
