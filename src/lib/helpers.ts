export function BigIntToNumber(value: bigint, decimals: number) {
  return Number(value) / (1 * Math.pow(10, decimals));
}
