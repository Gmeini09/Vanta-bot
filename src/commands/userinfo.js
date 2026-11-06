const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a user.')
    .addUserOption((o) => o.setName('member').setDescription('User (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('member') || interaction.user;
    const member = interaction.guild.members.cache.get(user.id);

    const roles = member
      ? member.roles.cache.filter((r) => r.id !== interaction.guild.id).map((r) => `${r}`).join(' ') || 'None'
      : 'Not in server';

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor && member.displayHexColor !== '#000000' ? member.displayColor : config.brand.color)
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'ID', value: `\`${user.id}\``, inline: true },
        { name: 'Bot', value: user.bot ? 'Yes' : 'No', inline: true },
        { name: 'Account created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false },
      );

    if (member?.joinedTimestamp) {
      embed.addFields({ name: 'Joined server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`, inline: false });
    }
    embed.addFields({ name: `Roles${member ? ` (${member.roles.cache.size - 1})` : ''}`, value: roles.slice(0, 1024) });

    return interaction.reply({ embeds: [embed] });
  },
};
