const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const config = require('../config');

// ---- The server blueprint ----------------------------------------------
// Edit this to change what the command builds. Roles are created top-first,
// so the first role ends up highest in the list.
const ROLES = [
  { name: 'Admin', color: 0xE74C3C, permissions: [PermissionFlagsBits.Administrator], hoist: true },
  { name: 'Staff', color: 0x3498DB, permissions: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.KickMembers], hoist: true },
  { name: 'Member', color: 0x9B59B6, permissions: [], hoist: false },
];

const CATEGORIES = [
  {
    name: '🏠 WELCOME',
    channels: [
      { name: '📜│rules', type: ChannelType.GuildText },
      { name: '📢│announcements', type: ChannelType.GuildText },
      { name: '👋│welcome', type: ChannelType.GuildText },
    ],
  },
  {
    name: '💬 COMMUNITY',
    channels: [
      { name: '💬│general', type: ChannelType.GuildText },
      { name: '🖼️│media', type: ChannelType.GuildText },
      { name: '😎│off-topic', type: ChannelType.GuildText },
    ],
  },
  {
    name: '🎫 SUPPORT',
    channels: [{ name: '🎫│tickets', type: ChannelType.GuildText }],
  },
  {
    name: '🔊 VOICE',
    channels: [
      { name: '🔊 General', type: ChannelType.GuildVoice },
      { name: '🎵 Music', type: ChannelType.GuildVoice },
    ],
  },
];
// ------------------------------------------------------------------------

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('DANGER: delete all channels + manageable roles and build a fresh structure.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { guild } = interaction;

    // Extra guard: only the server owner or an administrator may run this.
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: 'You need Administrator permission to use this.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const warn = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle('⚠️ Full server reset')
      .setDescription(
        'This will **delete every channel** and **every role the bot can manage**, ' +
          'then create a fresh set of channels and roles.\n\n' +
          '**This cannot be undone.** Are you sure?',
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup_confirm').setLabel('Yes, reset everything').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('setup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    await interaction.reply({ embeds: [warn], components: [buttons], flags: MessageFlags.Ephemeral });

    // Wait for the same user to click a button (30s).
    let choice;
    try {
      choice = await interaction.channel.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id && ['setup_confirm', 'setup_cancel'].includes(i.customId),
        time: 30_000,
      });
    } catch {
      return interaction.editReply({ content: 'Timed out — no changes made.', embeds: [], components: [] });
    }

    if (choice.customId === 'setup_cancel') {
      return choice.update({ content: 'Cancelled — no changes made.', embeds: [], components: [] });
    }

    await choice.update({ content: '🔧 Resetting the server…', embeds: [], components: [] });

    const me = guild.members.me;
    const log = [];

    // 1) Delete channels
    let deletedChannels = 0;
    for (const channel of guild.channels.cache.values()) {
      if (!channel.deletable) continue;
      try {
        await channel.delete('Server reset via /setup-server');
        deletedChannels++;
      } catch { /* skip */ }
    }
    log.push(`🗑️ Deleted **${deletedChannels}** channel(s).`);

    // 2) Delete roles (skip @everyone, managed/integration roles, and roles above the bot)
    let deletedRoles = 0;
    for (const role of guild.roles.cache.values()) {
      if (role.id === guild.id) continue; // @everyone
      if (role.managed) continue; // bot/integration/boost roles
      if (role.position >= me.roles.highest.position) continue; // can't touch roles at/above the bot
      try {
        await role.delete('Server reset via /setup-server');
        deletedRoles++;
      } catch { /* skip */ }
    }
    log.push(`🗑️ Deleted **${deletedRoles}** role(s).`);

    // 3) Create roles
    let createdRoles = 0;
    for (const r of ROLES) {
      try {
        await guild.roles.create({
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          permissions: r.permissions,
          reason: 'Server reset via /setup-server',
        });
        createdRoles++;
      } catch { /* skip */ }
    }
    log.push(`✨ Created **${createdRoles}** role(s).`);

    // 4) Create categories + channels
    let createdChannels = 0;
    let firstTextChannel = null;
    for (const cat of CATEGORIES) {
      let parent;
      try {
        parent = await guild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          reason: 'Server reset via /setup-server',
        });
      } catch { continue; }

      for (const ch of cat.channels) {
        try {
          const created = await guild.channels.create({
            name: ch.name,
            type: ch.type,
            parent: parent.id,
            reason: 'Server reset via /setup-server',
          });
          createdChannels++;
          if (!firstTextChannel && ch.type === ChannelType.GuildText) firstTextChannel = created;
        } catch { /* skip */ }
      }
    }
    log.push(`✨ Created **${createdChannels}** channel(s) in **${CATEGORIES.length}** categories.`);

    // Final summary — editReply still works even though this channel was deleted,
    // because it targets the interaction webhook, not the channel.
    const summary = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle('✅ Server reset complete')
      .setDescription(log.join('\n'))
      .setFooter({ text: config.brand.name })
      .setTimestamp();

    try {
      await interaction.editReply({ content: '', embeds: [summary], components: [] });
    } catch { /* channel gone, ignore */ }

    // Also drop a welcome note in the first new text channel if we made one.
    if (firstTextChannel) {
      firstTextChannel
        .send({ content: 'Server has been set up. Use `/ticket-panel` and `/role-panel` to add the interactive panels.' })
        .catch(() => {});
    }
  },
};
