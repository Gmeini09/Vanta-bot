const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const tickets = require('../tickets/manager');
const panels = require('../server/panels');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Post the ticket panel (category dropdown).')
    .addChannelOption((o) =>
      o.setName('channel').setDescription('Where to post it (defaults to here)').addChannelTypes(ChannelType.GuildText),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const msg = await channel.send(tickets.buildPanel(interaction.guild));
    panels.register(interaction.guild.id, 'tickets', channel.id, msg.id);
    return interaction.reply({ content: `✅ Ticket panel posted in ${channel}.`, flags: MessageFlags.Ephemeral });
  },
};
