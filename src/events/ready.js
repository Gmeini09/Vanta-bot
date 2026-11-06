const { Events, ActivityType, REST, Routes } = require('discord.js');
const config = require('../config');
const giveaways = require('../utils/giveaways');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[ready] Logged in as ${client.user.tag}`);

    client.user.setPresence({
      activities: [{ name: `${config.brand.name} • /help`, type: ActivityType.Watching }],
      status: 'online',
    });

    // Auto-register slash commands on startup so they always match the code.
    // With GUILD_ID set this is instant; without it, registers globally.
    try {
      const body = [...client.commands.values()].map((c) => c.data.toJSON());
      const rest = new REST().setToken(config.token);
      const clientId = config.clientId || client.user.id;

      if (config.guildId) {
        await rest.put(Routes.applicationGuildCommands(clientId, config.guildId), { body });
        console.log(`[ready] Registered ${body.length} command(s) to guild ${config.guildId}.`);
      } else {
        await rest.put(Routes.applicationCommands(clientId), { body });
        console.log(`[ready] Registered ${body.length} global command(s) (may take up to 1h).`);
      }
    } catch (err) {
      console.error('[ready] Failed to register commands:', err);
    }

    // Pick up giveaways that were running before a restart.
    giveaways.resumeAll(client);
  },
};
