const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const settings = require('../utils/settings');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    // Leaves are only logged for the team (mod logs), not in the public join channel.
    const id = settings.get(member.guild.id, 'modLogChannelId');
    const channel = id && member.guild.channels.cache.get(id);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(config.brand.danger)
      .setTitle('📤 Member left')
      .setDescription(`${member} — **${member.user.tag}** (\`${member.id}\`)\nMembers now: **${member.guild.memberCount}**`)
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
  },
};
