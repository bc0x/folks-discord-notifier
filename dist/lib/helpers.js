"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BigIntToNumber = void 0;
function BigIntToNumber(value, decimals) {
    return Number(value) / (1 * Math.pow(10, decimals));
}
exports.BigIntToNumber = BigIntToNumber;
