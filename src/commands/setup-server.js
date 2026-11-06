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
const settings = require('../utils/settings');
const tickets = require('../tickets/manager');

const P = PermissionFlagsBits;

// ---- The server blueprint ----------------------------------------------
// Roles are created top-first, so the first role ends up highest.
// `setting` stores the created role's ID in the bot settings automatically.
const ROLES = [
  { key: 'admin', name: '👑 Admin', color: 0xE74C3C, hoist: true, permissions: [P.Administrator] },
  {
    key: 'staff',
    name: '🛡️ Staff',
    color: 0x3498DB,
    hoist: true,
    setting: 'ticketSupportRoleId',
    permissions: [P.ManageMessages, P.KickMembers, P.ModerateMembers, P.MuteMembers, P.MoveMembers],
  },
  { key: 'member', name: '👤 Member', color: 0x9B59B6, hoist: false, setting: 'autoRoleId', permissions: [] },
];

// access: 'public' (default) | 'readonly' (only staff can write) | 'staff' (only staff can see)
// setting: store the created channel's ID in the bot settings
// panel: 'tickets' posts the ticket panel there
const CATEGORIES = [
  {
    name: '🏠 WELCOME',
    channels: [
      { name: '📜│rules', access: 'readonly' },
      { name: '📢│announcements', access: 'readonly' },
      { name: '👋│welcome', access: 'readonly', setting: ['welcomeChannelId', 'leaveChannelId'] },
    ],
  },
  {
    name: '💬 COMMUNITY',
    channels: [
      { name: '💬│general', main: true },
      { name: '🖼️│media' },
      { name: '🤖│commands' },
      { name: '😎│off-topic' },
    ],
  },
  {
    name: '🎫 SUPPORT',
    channels: [{ name: '🎫│open-a-ticket', access: 'readonly', panel: 'tickets' }],
  },
  {
    name: '📂 TICKETS',
    access: 'staff',
    setting: 'ticketCategoryId',
    channels: [],
  },
  {
    name: '🔊 VOICE',
    channels: [
      { name: '🔊 General', type: ChannelType.GuildVoice },
      { name: '🎮 Gaming', type: ChannelType.GuildVoice },
      { name: '🎵 Music', type: ChannelType.GuildVoice },
    ],
  },
  {
    name: '🔒 STAFF',
    access: 'staff',
    channels: [
      { name: '💬│staff-chat' },
      { name: '📋│mod-logs', setting: 'modLogChannelId' },
      { name: '🎫│ticket-logs', setting: 'ticketLogChannelId' },
      { name: '🔊 Staff', type: ChannelType.GuildVoice },
    ],
  },
];
// ------------------------------------------------------------------------

function overwritesFor(access, guild, roles) {
  const me = guild.members.me.id;
  const everyone = guild.roles.everyone.id;
  const staffIds = [roles.admin?.id, roles.staff?.id].filter(Boolean);

  if (access === 'staff') {
    return [
      { id: everyone, deny: [P.ViewChannel] },
      ...staffIds.map((id) => ({ id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.Connect] })),
      { id: me, allow: [P.ViewChannel, P.SendMessages, P.ManageChannels, P.ReadMessageHistory, P.Connect] },
    ];
  }
  if (access === 'readonly') {
    return [
      { id: everyone, deny: [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads, P.AddReactions] },
      ...staffIds.map((id) => ({ id, allow: [P.SendMessages] })),
      { id: me, allow: [P.ViewChannel, P.SendMessages, P.EmbedLinks] },
    ];
  }
  return [];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('DANGER: delete all channels + roles and build a fully configured server.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { guild } = interaction;

    if (!interaction.member.permissions.has(P.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission to use this.', flags: MessageFlags.Ephemeral });
    }

    const warn = new EmbedBuilder()
      .setColor(config.brand.danger)
      .setTitle('⚠️ Full server reset')
      .setDescription(
        'This will **delete every channel** and **every role I can manage**, then build a fresh, ' +
          'fully configured server (roles, channels, staff area, ticket system, logs).\n\n' +
          '**This cannot be undone.** Are you sure?',
      );
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup_confirm').setLabel('Yes, reset everything').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('setup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const response = await interaction.reply({
      embeds: [warn],
      components: [buttons],
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });

    let choice;
    try {
      choice = await response.resource.message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
      });
    } catch {
      return interaction.editReply({ content: 'Timed out — no changes made.', embeds: [], components: [] });
    }
    if (choice.customId === 'setup_cancel') {
      return choice.update({ content: 'Cancelled — no changes made.', embeds: [], components: [] });
    }
    await choice.update({ content: '🔧 Resetting the server… this can take a minute.', embeds: [], components: [] });

    const me = guild.members.me;
    const log = [];
    const saved = {};

    // 1) Delete channels
    let deletedChannels = 0;
    for (const channel of [...guild.channels.cache.values()]) {
      if (!channel.deletable) continue;
      await channel.delete('Server reset via /setup-server').then(() => deletedChannels++).catch(() => {});
    }
    log.push(`🗑️ Deleted **${deletedChannels}** channel(s)`);

    // 2) Delete roles (skip @everyone, managed/bot roles, roles at/above the bot)
    let deletedRoles = 0;
    for (const role of [...guild.roles.cache.values()]) {
      if (role.id === guild.id || role.managed || role.position >= me.roles.highest.position) continue;
      await role.delete('Server reset via /setup-server').then(() => deletedRoles++).catch(() => {});
    }
    log.push(`🗑️ Deleted **${deletedRoles}** role(s)`);

    // 3) Create roles
    const roles = {};
    for (const r of ROLES) {
      const role = await guild.roles
        .create({ name: r.name, color: r.color, hoist: r.hoist, permissions: r.permissions, reason: 'Server setup' })
        .catch(() => null);
      if (!role) continue;
      roles[r.key] = role;
      if (r.setting) saved[r.setting] = role.id;
    }
    log.push(`✨ Created **${Object.keys(roles).length}** role(s)`);

    // 4) Create categories + channels
    let createdChannels = 0;
    let mainChannel = null;
    let panelChannel = null;
    for (const cat of CATEGORIES) {
      const parent = await guild.channels
        .create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: overwritesFor(cat.access, guild, roles),
          reason: 'Server setup',
        })
        .catch(() => null);
      if (!parent) continue;
      if (cat.setting) saved[cat.setting] = parent.id;

      for (const ch of cat.channels) {
        const created = await guild.channels
          .create({
            name: ch.name,
            type: ch.type ?? ChannelType.GuildText,
            parent: parent.id,
            permissionOverwrites: overwritesFor(ch.access || cat.access, guild, roles),
            reason: 'Server setup',
          })
          .catch(() => null);
        if (!created) continue;
        createdChannels++;
        for (const key of [].concat(ch.setting || [])) saved[key] = created.id;
        if (ch.main) mainChannel = created;
        if (ch.panel === 'tickets') panelChannel = created;
      }
    }
    log.push(`✨ Created **${createdChannels}** channel(s) in **${CATEGORIES.length}** categories`);

    // 5) Save settings so welcome, logs, tickets and auto-role work right away
    settings.set(guild.id, saved);
    log.push('⚙️ Saved settings (welcome, logs, tickets, auto-role)');

    // 6) Post the ticket panel
    if (panelChannel) {
      const ok = await panelChannel.send(tickets.buildPanel(guild)).then(() => true).catch(() => false);
      if (ok) log.push(`🎫 Ticket panel posted in ${panelChannel}`);
    }

    // 7) Give the admin who ran this the Admin role
    if (roles.admin) {
      await interaction.member.roles.add(roles.admin, 'Server setup').catch(() => {});
    }

    const summary = new EmbedBuilder()
      .setColor(config.brand.success)
      .setTitle('✅ Server setup complete')
      .setDescription(log.join('\n'))
      .setFooter({ text: 'Tip: put the bot role at the very top of the role list.' })
      .setTimestamp();
    await interaction.editReply({ content: '', embeds: [summary], components: [] }).catch(() => {});

    if (mainChannel) {
      mainChannel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(config.brand.color)
              .setTitle(`Welcome to ${guild.name}!`)
              .setDescription('The server has been set up. Have fun! 🎉\nType `/help` to see what I can do.'),
          ],
        })
        .catch(() => {});
    }

    // 8) Give every existing member the Member role (in the background)
    if (roles.member) {
      const members = await guild.members.fetch().catch(() => null);
      if (members) {
        for (const m of members.values()) {
          if (m.user.bot) continue;
          await m.roles.add(roles.member, 'Server setup').catch(() => {});
        }
      }
    }
  },
};
