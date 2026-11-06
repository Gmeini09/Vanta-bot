const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const modlog = require('../utils/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by their ID.')
    .addStringOption((o) => o.setName('user_id').setDescription('The user ID to unban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const id = interaction.options.getString('user_id').trim();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!/^\d{17,20}$/.test(id)) {
      return interaction.reply({ content: 'That does not look like a valid user ID.', ephemeral: true });
    }

    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) {
      return interaction.reply({ content: 'That user is not banned.', ephemeral: true });
    }

    await interaction.guild.bans.remove(id, reason);
    await interaction.reply({ content: `✅ Unbanned **${ban.user.tag}**.` });

    modlog.log(interaction.guild, {
      action: '✅ Member unbanned',
      color: config.brand.success,
      target: ban.user,
      moderator: interaction.user,
      reason,
    });
  },
};
