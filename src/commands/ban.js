const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .addUserOption((o) => o.setName('member').setDescription('Member to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      return interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
    }
    if (!target.bannable) {
      return interaction.reply({
        content: "I can't ban that member (role hierarchy or missing permission).",
        ephemeral: true,
      });
    }

    await target.ban({ reason });
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setDescription(`🔨 **${target.user.tag}** was banned.\nReason: ${reason}`);
    return interaction.reply({ embeds: [embed] });
  },
};
