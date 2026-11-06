const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show what Vanta can do.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`${config.brand.name} — commands`)
      .setDescription(
        [
          '**/help** — this message',
          '**/ping** — check the bot latency',
          '**/ticket-panel** — post the ticket button (staff)',
          '**/role-panel** — post the self-role buttons (staff)',
          '**/clear** — bulk delete messages (staff)',
          '**/kick** — kick a member (staff)',
          '**/ban** — ban a member (staff)',
          '**/warn** — warn a member (staff)',
        ].join('\n'),
      )
      .setFooter({ text: config.brand.name })
      .setTimestamp();
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
