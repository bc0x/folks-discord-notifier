"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// lib/discord.ts
const discord_js_1 = require("discord.js");
let discord;
if (process.env.NODE_ENV === 'production') {
    discord = new discord_js_1.Client({ intents: [discord_js_1.Intents.FLAGS.GUILDS] });
}
else {
    if (!global.discord) {
        global.discord = new discord_js_1.Client({ intents: [discord_js_1.Intents.FLAGS.GUILDS] });
    }
    discord = global.discord;
}
exports.default = discord;
