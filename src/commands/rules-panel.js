const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const settings = require('../utils/settings');
const { buildRulesPanel } = require('../handlers/rules');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules-panel')
    .setDescription('Post the rules with an "Accept rules" button.')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Where to post it (defaults to here)').addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    await channel.send(buildRulesPanel(interaction.guild));

    const roleId = settings.get(interaction.guild.id, 'verifiedRoleId');
    const note = roleId
      ? `Members get <@&${roleId}> when they accept.`
      : 'No verified role is set yet — set one with `/settings role` so accepting gives a role.';
    return interaction.reply({ content: `✅ Rules panel posted in ${channel}.\n${note}`, flags: MessageFlags.Ephemeral });
  },
};
