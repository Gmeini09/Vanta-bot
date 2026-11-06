const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const warnings = require('../utils/warnings');
const modlog = require('../utils/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member (stored + DM).')
    .addUserOption((o) => o.setName('member').setDescription('Member to warn').setRequired(true))
    .addStringOption((o) => o.setName('reason').setDescription('Reason').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('member');
    const reason = interaction.options.getString('reason');

    if (!target) {
      return interaction.reply({ content: 'That member is not in this server.', flags: MessageFlags.Ephemeral });
    }
    if (target.user.bot) {
      return interaction.reply({ content: "You can't warn a bot.", flags: MessageFlags.Ephemeral });
    }

    const count = warnings.add(interaction.guild.id, target.id, {
      reason,
      mod: interaction.user.id,
      at: Date.now(),
    });

    await target
      .send(`You were warned in **${interaction.guild.name}**.\nReason: ${reason}\nYou now have **${count}** warning(s).`)
      .catch(() => null);

    const embed = new EmbedBuilder()
      .setColor(config.brand.warn)
      .setDescription(`⚠️ **${target.user.tag}** was warned.\nReason: ${reason}\nTotal warnings: **${count}**`);
    await interaction.reply({ embeds: [embed] });

    modlog.log(interaction.guild, {
      action: '⚠️ Member warned',
      color: config.brand.warn,
      target: target.user,
      moderator: interaction.user,
      reason,
      fields: [{ name: 'Total warnings', value: `${count}`, inline: true }],
    });
  },
};
