// lib/discord.ts
// having to use an old version due to vercel node v14
import { Client, Intents } from 'discord.js';

let discord: Client;

if (process.env.NODE_ENV === 'production') {
  discord = new Client({ intents: [Intents.FLAGS.GUILDS] });
} else {
  if (!global.discord) {
    global.discord = new Client({ intents: [Intents.FLAGS.GUILDS] });
  }
  discord = global.discord as Client;
}

export default discord;
