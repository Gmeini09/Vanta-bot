const { Events, ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[ready] Logged in as ${client.user.tag}`);
    client.user.setPresence({
      activities: [{ name: `${config.brand.name} • /help`, type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
