const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const { syncServer } = require('../server/sync');

const list = (items) => (items.length ? items.map((i) => `• ${i}`).join('\n').slice(0, 1024) : '—');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync-server')
    .setDescription('Update the server to the latest layout without deleting anything.')
    .addBooleanOption((o) =>
      o.setName('reset_permissions').setDescription('Also reset channel/role permissions to the defaults'),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const resetPermissions = interaction.options.getBoolean('reset_permissions') ?? false;
    const { report } = await syncServer(interaction.guild, { resetPermissions });

    const nothing = !report.created.length && !report.updated.length && !report.panels.length;
    const embed = new EmbedBuilder()
      .setColor(config.brand.success)
      .setTitle('🔄 Server synced')
      .setDescription(nothing ? 'Everything is already up to date.' : 'Nothing was deleted.')
      .addFields(
        { name: '✨ Created', value: list(report.created) },
        { name: '✏️ Updated', value: list(report.updated) },
        { name: '📌 Panels', value: list(report.panels) },
      )
      .setFooter({ text: resetPermissions ? 'Permissions were reset to the defaults.' : 'Permissions were left as they are.' })
      .setTimestamp();
    return interaction.editReply({ embeds: [embed] });
  },
};
