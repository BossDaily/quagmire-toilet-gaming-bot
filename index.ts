import {
  bold,
  dim,
  green,
  magenta,
  red,
  yellow,
  white,
} from 'colors';

import { DISCORD_TOKEN, COMMAND_PREFIXES, DATABASE } from './config.json';

import Bot from './src/Bot';

import Parser from 'rss-parser';

new Bot({
  intents: [
    'GUILDS',
    'GUILD_MEMBERS',
    'GUILD_MESSAGES',
    'GUILD_MESSAGE_REACTIONS',
    'DIRECT_MESSAGES',
    'GUILD_PRESENCES'
  ],
  allowedMentions: { parse: ['roles', 'users'] },
  presence: { status: 'dnd', activities: [{ type: 'WATCHING', name: 'Loading...' }] },
  partials: ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'],
}, {
  format: '[{{timestamp}}] Nyx | {{title}} | {{message}}',
  dateformat: 'HH:MM',
  // ? This is the actual usage of preprocess, so eslint is disabled here
  // eslint-disable-next-line no-param-reassign
  preprocess(data) { data.title = data.title.toUpperCase(); },
  filters: {
    log: white,
    trace: magenta,
    debug: dim,
    info: green,
    warn: yellow,
    error: [red, bold],
  },
}, {
  token: DISCORD_TOKEN,
  prefixes: COMMAND_PREFIXES,
  loadApplication: false,
  database: DATABASE,
  commandsPath: `${__dirname}/src/commands`,
  eventsPath: `${__dirname}/src/events`,
  schedulesPath: `${__dirname}/src/schedules`,
})
  .start()
  .catch(async (err) => {
    // ? console is used to log the error
    // eslint-disable-next-line no-console
    console.error(err);
  });


const parser = new Parser();

(async () => {

  const feed = await parser.parseURL('https://www.reddit.com/user/obligationown5122/m/gay_sex/.rss');
  console.log(feed.title); // feed will have a `foo` property, type as a string

  feed.items.forEach((item) => {
    console.log(item.title + ':' + item.link) // item will have a `bar` property type as a number
  });
})()