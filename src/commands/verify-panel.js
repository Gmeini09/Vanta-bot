const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const settings = require('../utils/settings');
const panels = require('../server/panels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify-panel')
    .setDescription('Post the verification message (react with ✅ to get the Member role).')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Where to post it (defaults to here)').addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await panels.ensure(interaction.guild, 'verify', channel);
    if (!result) return interaction.editReply(`❌ I couldn't post in ${channel}. Check my permissions there.`);

    const roleId = settings.get(interaction.guild.id, 'verifiedRoleId');
    const note = roleId
      ? `Members get <@&${roleId}> when they react with ✅.`
      : 'No verified role is set yet — set one with `/settings role` so reacting gives a role.';
    return interaction.editReply(`✅ Verify panel ${result} in ${channel}.\n${note}`);
  },
};
