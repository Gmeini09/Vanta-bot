const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');
const modlog = require('../utils/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server.')
    .addUserOption((o) => o.setName('member').setDescription('Member to kick').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) {
      return interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
    }
    if (!target.kickable) {
      return interaction.reply({
        content: "I can't kick that member (role hierarchy or missing permission).",
        ephemeral: true,
      });
    }

    await target.send(`You were kicked from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => null);
    await target.kick(reason);

    const embed = new EmbedBuilder()
      .setColor(config.brand.warn)
      .setDescription(`👢 **${target.user.tag}** was kicked.\nReason: ${reason}`);
    await interaction.reply({ embeds: [embed] });

    modlog.log(interaction.guild, {
      action: '👢 Member kicked',
      color: config.brand.warn,
      target: target.user,
      moderator: interaction.user,
      reason,
    });
  },
};
