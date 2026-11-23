const { Events, ActivityType } = require('discord.js');
const { registerIn, clearIn } = require('../utils/commands');
const { isActiveGuild } = require('../utils/active');
const { ensureOwnerRole } = require('../server/ownerRole');
const config = require('../config');
const giveaways = require('../utils/giveaways');
const panels = require('../server/panels');
const { syncAvatar } = require('../utils/logo');

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
      if (!isActiveGuild(guild.id)) {
        await clearIn(client, guild.id).catch(() => {});
        console.log(`[ready] ${guild.name}: inactive (not the active server).`);
        continue;
      }
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

    // Refresh panels the bot already posted (texts/prices). The server layout
    // itself is never built or changed on start — only /setup-server does that.
    for (const guild of client.guilds.cache.values()) {
      if (!isActiveGuild(guild.id)) continue;
      try {
        const refreshed = await panels.refreshAll(guild);
        if (refreshed) console.log(`[panels] ${guild.name}: refreshed ${refreshed} panel(s)`);
      } catch (err) {
        console.error(`[panels] ${guild.name} failed:`, err);
      }
    }

    // Remove the discount post as soon as the sale ends.
    const sale = require('../handlers/sale');
    if (sale.isActive()) {
      setTimeout(async () => {
        for (const guild of client.guilds.cache.values()) {
          if (!isActiveGuild(guild.id)) continue;
          const n = await panels.refreshAll(guild).catch(() => 0);
          if (n) console.log(`[sale] ${guild.name}: sale ended, post removed.`);
        }
      }, sale.endsAt() - Date.now() + 5000);
    }
  },
};
