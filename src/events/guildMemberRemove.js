const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    if (!config.leave.channelId) return;
    const channel = member.guild.channels.cache.get(config.leave.channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(config.brand.danger)
      .setDescription(
        `**${member.user.tag}** left the server.\nWe're now **${member.guild.memberCount}** members.`,
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
  },
};
