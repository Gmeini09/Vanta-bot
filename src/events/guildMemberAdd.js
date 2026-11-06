const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (!config.welcome.channelId) return;

    const channel = member.guild.channels.cache.get(config.welcome.channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`Welcome to ${member.guild.name}`)
      .setDescription(
        `Welcome <@${member.id}>!\n\nYou are member **#${member.guild.memberCount}**.`,
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setTimestamp();

    channel.send({ content: `<@${member.id}>`, embeds: [embed] }).catch(() => {});
  },
};
