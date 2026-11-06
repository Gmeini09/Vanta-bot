const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show a user\'s avatar.')
    .addUserOption((o) => o.setName('member').setDescription('User (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('member') || interaction.user;
    const url = user.displayAvatarURL({ size: 1024 });

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`${user.username}'s avatar`)
      .setImage(url)
      .setDescription(`[Open in browser](${url})`);

    return interaction.reply({ embeds: [embed] });
  },
};
