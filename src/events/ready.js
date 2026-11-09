const { Events, ActivityType, REST, Routes } = require('discord.js');
const config = require('../config');
const giveaways = require('../utils/giveaways');
const panels = require('../server/panels');
const { syncAvatar, syncGuildArt } = require('../utils/logo');
const { syncServer, isManaged } = require('../server/sync');

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

    // Use assets/logo.png as the bot's profile picture.
    await syncAvatar(client);

    // Pick up giveaways that were running before a restart.
    giveaways.resumeAll(client);

    // Bring every set-up server in line with the current layout (never deletes
    // anything) and refresh all posted panels with the latest texts.
    for (const guild of client.guilds.cache.values()) {
      try {
        if (isManaged(guild)) {
          await syncGuildArt(guild);
          const { report } = await syncServer(guild);
          console.log(
            `[sync] ${guild.name}: ${report.created.length} created, ${report.updated.length} updated, ${report.panels.length} panel(s)`,
          );
        }
        const refreshed = await panels.refreshAll(guild);
        if (refreshed) console.log(`[panels] ${guild.name}: refreshed ${refreshed} panel(s)`);
      } catch (err) {
        console.error(`[sync] ${guild.name} failed:`, err);
      }
    }

    // Remove the discount post as soon as the sale ends.
    const sale = require('../handlers/sale');
    if (sale.isActive()) {
      setTimeout(async () => {
        for (const guild of client.guilds.cache.values()) {
          const n = await panels.refreshAll(guild).catch(() => 0);
          if (n) console.log(`[sale] ${guild.name}: sale ended, post removed.`);
        }
      }, sale.endsAt() - Date.now() + 5000);
    }
  },
};
