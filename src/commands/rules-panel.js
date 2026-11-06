const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { buildRulesPanel } = require('../handlers/rules');
const panels = require('../server/panels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rules-panel')
    .setDescription('Post the rules panel.')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Where to post it (defaults to here)').addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const msg = await channel.send(buildRulesPanel(interaction.guild));
    panels.register(interaction.guild.id, 'rules', channel.id, msg.id);

    return interaction.reply({
      content: `✅ Rules panel posted in ${channel}. Members verify with \`/verify-panel\` (react with ✅).`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
