// Registers slash commands with Discord.
// Run locally once (and whenever commands change):  npm run deploy
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const config = require('./config');

if (!config.token || !config.clientId) {
  console.error('[deploy] DISCORD_TOKEN and CLIENT_ID are required.');
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  if (command?.data) commands.push(command.data.toJSON());
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`Registering ${commands.length} slash command(s)...`);
    if (config.guildId) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
        body: commands,
      });
      console.log(`Done — registered to guild ${config.guildId} (instant).`);
    } else {
      await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
      console.log('Done — registered globally (may take up to 1h to appear).');
    }
  } catch (err) {
    console.error('[deploy] Failed:', err);
    process.exit(1);
  }
})();
