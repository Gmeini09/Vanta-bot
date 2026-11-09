const { Events } = require('discord.js');
const { registerIn } = require('../utils/commands');

// Bot was added to a new server: make the slash commands available there.
// The server layout is NOT changed — run /setup-server for that.
module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    try {
      const n = await registerIn(guild.client, guild.id);
      console.log(`[guild] Joined ${guild.name}: registered ${n} command(s).`);
    } catch (err) {
      console.error(`[guild] ${guild.name}: could not register commands:`, err.message);
    }
  },
};
