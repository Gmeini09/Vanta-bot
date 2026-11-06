// The server layout. Used by /setup-server (fresh build) and by the automatic
// sync on startup / /sync-server (non-destructive update).
//
// Every role, category and channel has a stable `key`. Change names, emojis or
// order here and the bot updates the existing server on the next start —
// nothing is deleted. New entries are created automatically.
const { PermissionFlagsBits: P, ChannelType } = require('discord.js');

// Roles: the first entry ends up highest. `setting` stores the role ID in the bot settings.
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
  // Members get this role by accepting the rules (rules panel button).
  { key: 'member', name: '👤 Member', color: 0x9B59B6, hoist: false, setting: 'verifiedRoleId', permissions: [] },
];

// access: 'public' (default) | 'members' (only after accepting the rules) | 'staff' (only staff can see)
// readonly: only staff (and the bot) can write
// setting: store the channel ID in the bot settings
// panel: 'rules' / 'tickets' keeps that panel posted and up to date there
const CATEGORIES = [
  {
    key: 'welcome',
    name: '🏠 WELCOME',
    readonly: true,
    channels: [
      { key: 'rules', name: '📜│rules', panel: 'rules' },
      { key: 'announcements', name: '📢│announcements' },
      { key: 'welcome', name: '👋│welcome', setting: ['welcomeChannelId', 'leaveChannelId'] },
    ],
  },
  {
    key: 'community',
    name: '💬 COMMUNITY',
    access: 'members',
    channels: [
      { key: 'general', name: '💬│general', main: true },
      { key: 'media', name: '🖼️│media' },
      { key: 'commands', name: '🤖│commands' },
      { key: 'off-topic', name: '😎│off-topic' },
    ],
  },
  {
    key: 'support',
    name: '🎫 SUPPORT',
    access: 'members',
    channels: [{ key: 'open-ticket', name: '🎫│open-a-ticket', readonly: true, panel: 'tickets' }],
  },
  { key: 'tickets', name: '📂 TICKETS', access: 'staff', setting: 'ticketCategoryId', channels: [] },
  {
    key: 'voice',
    name: '🔊 VOICE',
    access: 'members',
    channels: [
      { key: 'vc-general', name: '🔊 General', type: ChannelType.GuildVoice },
      { key: 'vc-gaming', name: '🎮 Gaming', type: ChannelType.GuildVoice },
      { key: 'vc-music', name: '🎵 Music', type: ChannelType.GuildVoice },
    ],
  },
  {
    key: 'staff',
    name: '🔒 STAFF',
    access: 'staff',
    channels: [
      { key: 'staff-chat', name: '💬│staff-chat' },
      { key: 'mod-logs', name: '📋│mod-logs', setting: 'modLogChannelId' },
      { key: 'ticket-logs', name: '🎫│ticket-logs', setting: 'ticketLogChannelId' },
      { key: 'vc-staff', name: '🔊 Staff', type: ChannelType.GuildVoice },
    ],
  },
];

function overwritesFor(access, readonly, guild, roles) {
  const me = guild.members.me.id;
  const everyone = guild.roles.everyone.id;
  const staffIds = [roles.admin?.id, roles.staff?.id].filter(Boolean);
  const STAFF_ALLOW = [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.Connect];
  const BOT_ALLOW = [P.ViewChannel, P.SendMessages, P.EmbedLinks, P.ManageChannels, P.ReadMessageHistory, P.Connect];
  const WRITE = [P.SendMessages, P.CreatePublicThreads, P.CreatePrivateThreads, P.AddReactions];

  if (access === 'staff') {
    return [
      { id: everyone, deny: [P.ViewChannel] },
      ...staffIds.map((id) => ({ id, allow: STAFF_ALLOW })),
      { id: me, allow: BOT_ALLOW },
    ];
  }

  const everyoneDeny = [];
  if (access === 'members') everyoneDeny.push(P.ViewChannel);
  if (readonly) everyoneDeny.push(...WRITE);

  const list = [];
  if (everyoneDeny.length) list.push({ id: everyone, deny: everyoneDeny });
  if (access === 'members' && roles.member) {
    list.push(
      readonly
        ? { id: roles.member.id, allow: [P.ViewChannel], deny: WRITE }
        : { id: roles.member.id, allow: [P.ViewChannel] },
    );
  }
  if (list.length) {
    list.push(...staffIds.map((id) => ({ id, allow: STAFF_ALLOW })));
    list.push({ id: me, allow: BOT_ALLOW });
  }
  return list;
}

module.exports = { ROLES, CATEGORIES, overwritesFor };
