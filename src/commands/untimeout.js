const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const config = require('../config');
const modlog = require('../utils/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a member\'s timeout.')
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('member');
    if (!target) return interaction.reply({ content: 'That member is not here.', flags: MessageFlags.Ephemeral });
    if (!target.isCommunicationDisabled()) {
      return interaction.reply({ content: 'That member is not timed out.', flags: MessageFlags.Ephemeral });
    }

    await target.timeout(null);
    await interaction.reply({ content: `🔈 Removed timeout for **${target.user.tag}**.` });

    modlog.log(interaction.guild, {
      action: '🔈 Timeout removed',
      color: config.brand.success,
      target: target.user,
      moderator: interaction.user,
    });
  },
};
