const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const config = require('../config');

module.exports = {
  async openTicket(interaction) {
    const { guild, user } = interaction;

    // Prevent duplicate tickets per user
    const existing = guild.channels.cache.find(
      (c) => c.name === `ticket-${user.username}`.toLowerCase().slice(0, 100),
    );
    if (existing) {
      return interaction.reply({
        content: `You already have an open ticket: <#${existing.id}>`,
        ephemeral: true,
      });
    }

    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
    ];

    if (config.tickets.supportRoleId) {
      overwrites.push({
        id: config.tickets.supportRoleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }

    const channel = await guild.channels.create({
      name: `ticket-${user.username}`.toLowerCase().slice(0, 100),
      type: ChannelType.GuildText,
      parent: config.tickets.categoryId || undefined,
      permissionOverwrites: overwrites,
    });

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle('Ticket opened')
      .setDescription(
        `Hey <@${user.id}>, a staff member will be with you shortly.\n` +
          'Describe your request and press the button below to close when done.',
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Close ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
    );

    const mention = config.tickets.supportRoleId ? `<@&${config.tickets.supportRoleId}>` : '';
    await channel.send({ content: `${mention} <@${user.id}>`.trim(), embeds: [embed], components: [row] });

    return interaction.reply({ content: `Ticket created: <#${channel.id}>`, ephemeral: true });
  },

  async closeTicket(interaction) {
    const channel = interaction.channel;
    if (!channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: 'This is not a ticket channel.', ephemeral: true });
    }

    await interaction.reply({ content: 'Closing this ticket in 5 seconds…' });
    setTimeout(() => channel.delete().catch(() => {}), 5000);
  },
};
