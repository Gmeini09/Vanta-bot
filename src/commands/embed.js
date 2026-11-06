const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Post a custom embed in this channel.')
    .addStringOption((o) => o.setName('title').setDescription('Embed title').setRequired(true))
    .addStringOption((o) => o.setName('description').setDescription('Embed text (use \\n for new lines)').setRequired(true))
    .addStringOption((o) => o.setName('color').setDescription('Hex color, e.g. #8B5CF6'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description').replace(/\\n/g, '\n');
    const colorRaw = interaction.options.getString('color');

    let color = config.brand.color;
    if (colorRaw) {
      const parsed = parseInt(colorRaw.replace('#', ''), 16);
      if (!Number.isNaN(parsed)) color = parsed;
    }

    const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description);
    await interaction.channel.send({ embeds: [embed] });
    return interaction.reply({ content: 'Embed posted.', flags: MessageFlags.Ephemeral });
  },
};
