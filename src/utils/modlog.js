const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const settings = require('./settings');

// Sends a moderation log embed to the configured mod-log channel (if any).
async function log(guild, { action, color, moderator, target, reason, fields = [] }) {
  const id = settings.get(guild.id, 'modLogChannelId');
  const channel = id && guild.channels.cache.get(id);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(color ?? config.brand.color)
    .setAuthor({ name: action })
    .setTimestamp();

  if (target) {
    embed.addFields({ name: 'Member', value: `${target} (\`${target.id ?? target}\`)`, inline: true });
    if (target.displayAvatarURL) embed.setThumbnail(target.displayAvatarURL({ size: 128 }));
  }
  if (moderator) embed.addFields({ name: 'Moderator', value: `${moderator}`, inline: true });
  if (reason) embed.addFields({ name: 'Reason', value: reason.slice(0, 1024) });
  if (fields.length) embed.addFields(...fields);

  channel.send({ embeds: [embed] }).catch(() => {});
}

module.exports = { log };
