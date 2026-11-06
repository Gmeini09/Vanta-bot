const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const settings = require('../utils/settings');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const id = settings.get(member.guild.id, 'leaveChannelId');
    const channel = id && member.guild.channels.cache.get(id);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(config.brand.danger)
      .setDescription(`👋 **${member.user.tag}** left the server.\nWe're now **${member.guild.memberCount}** members.`)
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
  },
};
