const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('role-panel')
    .setDescription('Post the self-assignable role buttons in this channel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const entries = Object.entries(config.roleButtons).filter(([, roleId]) => roleId);

    if (entries.length === 0) {
      return interaction.reply({
        content:
          'No roles configured yet. Set the `ROLE_BUTTONS` env var (JSON of customId→roleId) ' +
          'or edit src/config.js, then restart the bot.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const row = new ActionRowBuilder();
    for (const [customId, roleId] of entries.slice(0, 5)) {
      const role = interaction.guild.roles.cache.get(roleId);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(customId)
          .setLabel(role ? role.name : customId)
          .setStyle(ButtonStyle.Secondary),
      );
    }

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle('Choose your roles')
      .setDescription('Click a button to add or remove a role.')
      .setFooter({ text: config.brand.name });

    await interaction.channel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: 'Role panel posted.', flags: MessageFlags.Ephemeral });
  },
};
