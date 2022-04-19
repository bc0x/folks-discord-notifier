// lib/discord.ts
const { Client, Intents } = require('discord.js');

let discord;

if (process.env.NODE_ENV === 'production') {
  discord = new Client({ intents: [Intents.FLAGS.GUILDS] });
} else {
  if (!global.discord) {
    global.discord = new Client({ intents: [Intents.FLAGS.GUILDS] });
  }
  discord = global.discord;
}

module.exports = discord;
