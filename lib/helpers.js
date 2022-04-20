function BigIntToNumber(value, decimals) {
  return Number(value) / (1 * Math.pow(10, decimals));
}

module.exports = { BigIntToNumber };
