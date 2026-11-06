const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const modlog = require('../utils/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Bulk delete recent messages in this channel.')
    .addIntegerOption((o) =>
      o.setName('amount').setDescription('How many messages (1-100)').setMinValue(1).setMaxValue(100).setRequired(true),
    )
    .addUserOption((o) => o.setName('user').setDescription('Only delete messages from this user'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');

    let messages = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) {
      return interaction.reply({ content: 'Could not fetch messages.', ephemeral: true });
    }

    if (user) messages = messages.filter((m) => m.author.id === user.id);
    const toDelete = [...messages.values()].slice(0, amount);

    const deleted = await interaction.channel.bulkDelete(toDelete, true).catch(() => null);
    if (!deleted) {
      return interaction.reply({
        content: 'Could not delete. Messages older than 14 days cannot be bulk-deleted.',
        ephemeral: true,
      });
    }

    await interaction.reply({ content: `Deleted **${deleted.size}** message(s).`, ephemeral: true });

    modlog.log(interaction.guild, {
      action: '🧹 Messages cleared',
      color: config.brand.color,
      moderator: interaction.user,
      fields: [
        { name: 'Channel', value: `${interaction.channel}`, inline: true },
        { name: 'Amount', value: `${deleted.size}`, inline: true },
        ...(user ? [{ name: 'Filtered user', value: `${user}`, inline: true }] : []),
      ],
    });
  },
};
