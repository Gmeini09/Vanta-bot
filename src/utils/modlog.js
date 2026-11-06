const { EmbedBuilder } = require('discord.js');
const config = require('../config');

// Sends a moderation log embed to the configured mod-log channel (if any).
// `action` is a short title, `fields` an array of { name, value }.
async function log(guild, { action, color, moderator, target, reason, fields = [] }) {
  if (!config.modLogChannelId) return;
  const channel = guild.channels.cache.get(config.modLogChannelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(color ?? config.brand.color)
    .setAuthor({ name: action })
    .setTimestamp();

  if (target) {
    embed.addFields({
      name: 'Member',
      value: `${target} (\`${target.id ?? target}\`)`,
      inline: true,
    });
  }
  if (moderator) {
    embed.addFields({ name: 'Moderator', value: `${moderator}`, inline: true });
  }
  if (reason) {
    embed.addFields({ name: 'Reason', value: reason });
  }
  if (fields.length) embed.addFields(...fields);

  channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { log };
