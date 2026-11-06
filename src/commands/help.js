const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');

const CATEGORIES = {
  '🛠️ Utility': ['/help', '/ping', '/userinfo', '/serverinfo', '/avatar', '/poll'],
  '🎫 Tickets': ['/ticket close', '/ticket add', '/ticket remove', '/ticket rename', '/ticket-panel'],
  '🎟️ Roles': ['/role-panel'],
  '🛡️ Moderation': [
    '/kick', '/ban', '/unban', '/timeout', '/untimeout',
    '/warn', '/warnings', '/clear', '/slowmode', '/lock', '/unlock',
  ],
  '🎉 Fun': ['/giveaway'],
  '📢 Staff': ['/say', '/embed'],
  '⚙️ Admin': ['/settings', '/setup-server'],
};

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show what Vanta can do.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`${config.brand.name} — commands`)
      .setDescription('Here is everything I can do. Most moderation commands require the matching permission.')
      .setFooter({ text: config.brand.name })
      .setTimestamp();

    for (const [cat, cmds] of Object.entries(CATEGORIES)) {
      embed.addFields({ name: cat, value: cmds.join(' · ') });
    }

    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
