const config = require('../config');

const isActiveGuild = (guildId) => !config.activeGuildId || guildId === config.activeGuildId;

// Finds the guild an event belongs to (member, message, reaction, interaction, channel, guild).
function guildOf(arg) {
  if (!arg || typeof arg !== 'object') return null;
  return arg.guildId ?? arg.guild?.id ?? arg.message?.guildId ?? (arg.members && arg.channels ? arg.id : null);
}

module.exports = { isActiveGuild, guildOf };
