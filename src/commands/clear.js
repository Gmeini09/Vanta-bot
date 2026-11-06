const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete recent messages in this channel.')
    .addIntegerOption((o) =>
      o
        .setName('amount')
        .setDescription('How many messages (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    // bulkDelete can only remove messages younger than 14 days.
    const deleted = await interaction.channel.bulkDelete(amount, true).catch(() => null);

    if (!deleted) {
      return interaction.reply({
        content: 'Could not delete. Messages older than 14 days cannot be bulk-deleted.',
        ephemeral: true,
      });
    }
    return interaction.reply({ content: `Deleted **${deleted.size}** message(s).`, ephemeral: true });
  },
};
