const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const config = require('../config');
const tickets = require('../tickets/manager');

const EPH = MessageFlags.Ephemeral;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage the current ticket.')
    .addSubcommand((s) =>
      s
        .setName('add')
        .setDescription('Add a member to this ticket.')
        .addUserOption((o) => o.setName('member').setDescription('Member to add').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('remove')
        .setDescription('Remove a member from this ticket.')
        .addUserOption((o) => o.setName('member').setDescription('Member to remove').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('rename')
        .setDescription('Rename this ticket channel.')
        .addStringOption((o) => o.setName('name').setDescription('New name').setRequired(true).setMaxLength(90)),
    )
    .addSubcommand((s) =>
      s
        .setName('close')
        .setDescription('Close this ticket.')
        .addStringOption((o) => o.setName('reason').setDescription('Why is it being closed?').setMaxLength(500)),
    ),

  async execute(interaction) {
    const channel = interaction.channel;
    const t = tickets.getTicket(channel);
    if (!t) return interaction.reply({ content: 'Use this command inside a ticket channel.', flags: EPH });

    const sub = interaction.options.getSubcommand();
    const staff = tickets.isStaff(interaction.member);

    if (sub === 'close') {
      if (!staff && interaction.user.id !== t.ownerId) {
        return interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', flags: EPH });
      }
      if (t.status !== 'open') return interaction.reply({ content: 'This ticket is already closed.', flags: EPH });
      await interaction.reply({ content: '🔒 Closing ticket…', flags: EPH });
      await tickets.closeTicket(channel, interaction.user, interaction.options.getString('reason'));
      return;
    }

    if (!staff) return interaction.reply({ content: 'Only staff can do that.', flags: EPH });

    if (sub === 'add') {
      const user = interaction.options.getUser('member');
      await channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
      });
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.brand.success).setDescription(`➕ ${user} was added to the ticket.`)],
      });
    }

    if (sub === 'remove') {
      const user = interaction.options.getUser('member');
      if (user.id === t.ownerId) {
        return interaction.reply({ content: "You can't remove the ticket owner. Close the ticket instead.", flags: EPH });
      }
      await channel.permissionOverwrites.delete(user.id).catch(() => {});
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor(config.brand.danger).setDescription(`➖ ${user} was removed from the ticket.`)],
      });
    }

    if (sub === 'rename') {
      const name = interaction.options
        .getString('name')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .slice(0, 90);
      await interaction.reply({ content: `✏️ Renaming to **${name}** (Discord may delay renames for a few minutes).`, flags: EPH });
      channel.setName(name).catch(() => {});
    }
  },
};
