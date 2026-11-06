const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const modlog = require('../utils/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server.')
    .addUserOption((o) => o.setName('member').setDescription('Member to ban').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
    .addIntegerOption((o) =>
      o.setName('delete_days').setDescription('Delete this many days of their messages (0-7)').setMinValue(0).setMaxValue(7),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const user = interaction.options.getUser('member');
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const days = interaction.options.getInteger('delete_days') ?? 0;

    if (target && !target.bannable) {
      return interaction.reply({
        content: "I can't ban that member (role hierarchy or missing permission).",
        flags: MessageFlags.Ephemeral,
      });
    }

    await target?.send(`You were banned from **${interaction.guild.name}**.\nReason: ${reason}`).catch(() => null);
    await interaction.guild.bans.create(user.id, { reason, deleteMessageSeconds: days * 86400 });

    const embed = new EmbedBuilder()
      .setColor(config.brand.danger)
      .setDescription(`🔨 **${user.tag}** was banned.\nReason: ${reason}`);
    await interaction.reply({ embeds: [embed] });

    modlog.log(interaction.guild, {
      action: '🔨 Member banned',
      color: config.brand.danger,
      target: user,
      moderator: interaction.user,
      reason,
    });
  },
};
