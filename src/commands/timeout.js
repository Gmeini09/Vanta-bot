const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');
const modlog = require('../utils/modlog');

const UNITS = { m: 60_000, h: 3_600_000, d: 86_400_000 };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Temporarily mute a member.')
    .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true))
    .addStringOption((o) =>
      o.setName('duration').setDescription('e.g. 10m, 2h, 1d (max 28d)').setRequired(true),
    )
    .addStringOption((o) => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const target = interaction.options.getMember('member');
    const raw = interaction.options.getString('duration').trim().toLowerCase();
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!target) return interaction.reply({ content: 'That member is not here.', ephemeral: true });
    if (!target.moderatable) {
      return interaction.reply({ content: "I can't time out that member.", ephemeral: true });
    }

    const match = raw.match(/^(\d+)(m|h|d)$/);
    if (!match) {
      return interaction.reply({ content: 'Invalid duration. Use e.g. `10m`, `2h`, `1d`.', ephemeral: true });
    }
    const ms = parseInt(match[1], 10) * UNITS[match[2]];
    if (ms > 28 * UNITS.d) {
      return interaction.reply({ content: 'Maximum timeout is 28 days.', ephemeral: true });
    }

    await target.timeout(ms, reason);

    const embed = new EmbedBuilder()
      .setColor(config.brand.warn)
      .setDescription(`🔇 **${target.user.tag}** was timed out for **${raw}**.\nReason: ${reason}`);
    await interaction.reply({ embeds: [embed] });

    modlog.log(interaction.guild, {
      action: '🔇 Member timed out',
      color: config.brand.warn,
      target: target.user,
      moderator: interaction.user,
      reason,
      fields: [{ name: 'Duration', value: raw, inline: true }],
    });
  },
};
