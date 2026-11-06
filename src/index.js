const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');

if (!config.token) {
  console.error('[fatal] DISCORD_TOKEN is missing. Set it as an environment variable.');
  process.exit(1);
}

// --- Load slash commands (once) ---
const commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command?.data && command?.execute) {
    commands.set(command.data.name, command);
  } else {
    console.warn(`[commands] ${file} is missing "data" or "execute", skipped.`);
  }
}

// --- Load event modules (once) ---
const eventsPath = path.join(__dirname, 'events');
const events = fs
  .readdirSync(eventsPath)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(eventsPath, f)));

const BASE_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
];

function createClient(withMessageContent) {
  const client = new Client({
    intents: withMessageContent ? [...BASE_INTENTS, GatewayIntentBits.MessageContent] : BASE_INTENTS,
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });
  client.commands = commands;
  client.hasMessageContent = withMessageContent;

  for (const event of events) {
    const handler = (...args) =>
      Promise.resolve(event.execute(...args, client)).catch((err) =>
        console.error(`[event:${event.name}]`, err),
      );
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);
  }
  return client;
}

// The Message Content intent is needed so ticket transcripts include message
// text. If it isn't enabled in the Developer Portal, start without it instead
// of crashing.
async function start() {
  let client = createClient(true);
  try {
    await client.login(config.token);
  } catch (err) {
    if (!String(err?.message).toLowerCase().includes('disallowed intents')) throw err;
    console.warn(
      '[startup] Message Content Intent is not enabled in the Developer Portal — ' +
        'starting without it. Ticket transcripts will not contain message text.',
    );
    await client.destroy().catch(() => {});
    client = createClient(false);
    await client.login(config.token);
  }
}

// --- Safety nets ---
process.on('unhandledRejection', (reason) => console.error('[unhandledRejection]', reason));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

start().catch((err) => {
  console.error('[fatal] could not log in:', err);
  process.exit(1);
});
