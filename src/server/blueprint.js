// The server layout. Used by /setup-server (fresh build) and by the automatic
// sync on startup / /sync-server (non-destructive update).
//
// Every role, category and channel has a stable `key`. Change names, emojis or
// order here and the bot updates the existing server on the next start —
// nothing is deleted. New entries are created automatically.
const { PermissionFlagsBits: P, ChannelType } = require('discord.js');

// Roles: the first entry ends up highest. `setting` stores the role ID in the bot settings.
const ROLES = [
  { key: 'admin', name: '💻 DEV', color: 0xE74C3C, hoist: true, permissions: [P.Administrator] },
  {
    key: 'staff',
    name: '🛡️ Staff',
    color: 0x3498DB,
    hoist: true,
    setting: 'ticketSupportRoleId',
    permissions: [P.ManageMessages, P.KickMembers, P.ModerateMembers, P.MuteMembers, P.MoveMembers],
  },
  // Members get this role by reacting with ✅ in the verify channel.
  { key: 'member', name: '👤 Member', color: 0x9B59B6, hoist: false, setting: 'verifiedRoleId', permissions: [] },
];

// access: 'public' (default) | 'members' (only after verifying) | 'staff' (only staff can see)
//         | 'unverified' (everyone sees it until they verify, then it disappears)
// readonly: only staff (and the bot) can write
// setting: store the channel ID in the bot settings
// panel: 'rules' / 'tickets' / 'verify' keeps that panel posted and up to date there
const CATEGORIES = [
  {
    key: 'welcome',
    name: 'Welcome',
    readonly: true,
    channels: [
      { key: 'welcome', name: '👋│join', setting: 'welcomeChannelId' },
      { key: 'rules', name: '🧾│rules', panel: 'rules' },
      { key: 'verify', name: '✅│verify', access: 'unverified', panel: 'verify' },
    ],
  },
  {
    key: 'information',
    name: 'information',
    access: 'members',
    readonly: true,
    channels: [
      { key: 'info', name: '❗│info', main: true },
      { key: 'status', name: '🟢│status' },
      { key: 'giveaway', name: '🎉│giveaway' },
      { key: 'showcase', name: '📷│showcase' },
      { key: 'ref-bypass', name: '✍️│proof' },
      { key: 'bypassed', name: '⭐│bypassed' },
    ],
  },
  {
    key: 'support',
    name: 'Ticket',
    access: 'members',
    readonly: true,
    channels: [{ key: 'open-ticket', name: '✉️│ticket', panel: 'tickets' }],
  },
  {
    key: 'product',
    name: 'product',
    access: 'members',
    readonly: true,
    channels: [
      { key: 'discount', name: '🔥│discount', panel: 'sale' },
      { key: 'public', name: '🛒│public', panel: 'plan-public' },
      { key: 'private', name: '🛒│private', panel: 'plan-private' },
    ],
  },
  // Ticket channels are created in here (purchase tickets get their own category).
  { key: 'purchase-tickets', name: 'Purchase', access: 'staff', setting: 'purchaseTicketCategoryId', channels: [] },
  { key: 'tickets', name: 'Support', access: 'staff', setting: 'ticketCategoryId', channels: [] },
  // Closed tickets are moved here (staff only).
  { key: 'closed-purchase', name: 'Closed Purchase', access: 'staff', setting: 'closedPurchaseCategoryId', channels: [] },
  { key: 'closed-support', name: 'Closed Support', access: 'staff', setting: 'closedTicketCategoryId', channels: [] },
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

// Channels that were removed from the layout. The sync deletes them once
// (looked up by the ID it stored for `category.channel`).
const REMOVED = ['product.kernel'];

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

  // Visible to everyone until they get the Member role. Reacting is still
  // possible: anyone can click a reaction that already exists on a message.
  if (access === 'unverified') {
    const list = [{ id: everyone, allow: [P.ViewChannel, P.ReadMessageHistory], deny: WRITE }];
    if (roles.member) list.push({ id: roles.member.id, deny: [P.ViewChannel] });
    list.push(...staffIds.map((id) => ({ id, allow: STAFF_ALLOW })));
    list.push({ id: me, allow: [...BOT_ALLOW, P.AddReactions, P.ManageMessages] });
    return list;
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

module.exports = { ROLES, CATEGORIES, REMOVED, overwritesFor };
