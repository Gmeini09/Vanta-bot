const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (sends them a DM).')
    .addUserOption((o) => o.setName('member').setDescription('Member to warn').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason');

    if (!target) {
      return interaction.reply({ content: 'That member is not in this server.', ephemeral: true });
    }

    await target
      .send(`You were warned in **${interaction.guild.name}**.\nReason: ${reason}`)
      .catch(() => null); // user may have DMs closed

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setDescription(`⚠️ **${target.user.tag}** was warned.\nReason: ${reason}`);
    return interaction.reply({ embeds: [embed] });
  },
};
