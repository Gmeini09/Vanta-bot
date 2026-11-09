const { Events, ActivityType } = require('discord.js');
const { registerIn } = require('../utils/commands');
const { ensureOwnerRole } = require('../server/ownerRole');
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

    // Register slash commands in every server the bot is in (instant).
    for (const guild of client.guilds.cache.values()) {
      try {
        const n = await registerIn(client, guild.id);
        console.log(`[ready] Registered ${n} command(s) in ${guild.name}.`);
        await ensureOwnerRole(guild);
      } catch (err) {
        console.error(`[ready] ${guild.name}: failed to register commands:`, err.message);
      }
    }

    // Bot name (Discord allows only a few name changes per hour).
    if (client.user.username !== config.botName) {
      await client.user
        .setUsername(config.botName)
        .then(() => console.log(`[ready] Renamed bot to ${config.botName}.`))
        .catch((err) => console.error('[ready] Could not rename bot:', err.message));
    }

    const invite = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
    console.log(`[ready] Invite link: ${invite}`);

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
