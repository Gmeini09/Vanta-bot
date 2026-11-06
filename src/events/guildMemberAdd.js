const { Events, EmbedBuilder } = require('discord.js');
const config = require('../config');
const settings = require('../utils/settings');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const s = settings.getAll(member.guild.id);

    // Auto-role
    if (s.autoRoleId && !member.user.bot) {
      const role = member.guild.roles.cache.get(s.autoRoleId);
      if (role) member.roles.add(role, 'Auto-role').catch(() => {});
    }

    // Welcome message
    const channel = s.welcomeChannelId && member.guild.channels.cache.get(s.welcomeChannelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`Welcome to ${member.guild.name}!`)
      .setDescription(
        `Hey ${member}, great to have you here! 👋\n\n` +
          `You are member **#${member.guild.memberCount}**.\n` +
          `Account created <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>.`,
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: config.brand.name })
      .setTimestamp();

    channel.send({ content: `${member}`, embeds: [embed] }).catch(() => {});
  },
};
