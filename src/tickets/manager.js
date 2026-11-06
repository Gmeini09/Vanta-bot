const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const store = require('../utils/store');
const settings = require('../utils/settings');
const CATEGORIES = require('./categories');
const PRODUCTS = require('./products');
const { buildTranscript, toAttachment } = require('./transcript');

const EPH = MessageFlags.Ephemeral;
const MAX_OPEN_PER_USER = 1;

// ---------------------------------------------------------------------------
// Storage: ticket counter per guild + metadata per ticket channel
// ---------------------------------------------------------------------------
function db() {
  const d = store.read('tickets');
  d.counters ??= {};
  d.channels ??= {};
  return d;
}
function save(d) {
  store.write('tickets', d);
}
function setMeta(channelId, patch) {
  const d = db();
  d.channels[channelId] = { ...(d.channels[channelId] || {}), ...patch };
  save(d);
  return d.channels[channelId];
}
function deleteMeta(channelId) {
  const d = db();
  if (d.channels[channelId]) {
    delete d.channels[channelId];
    save(d);
  }
}
function nextNumber(guildId) {
  const d = db();
  d.counters[guildId] = (d.counters[guildId] || 0) + 1;
  save(d);
  return d.counters[guildId];
}
const pad = (n) => String(n).padStart(4, '0');
const category = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

// Returns ticket metadata for a channel. Falls back to parsing the channel
// topic, so tickets keep working even if the data file was lost.
function getTicket(channel) {
  if (!channel || channel.type !== ChannelType.GuildText) return null;
  const meta = db().channels[channel.id];
  if (meta) return meta;

  const topic = channel.topic || '';
  const owner = topic.match(/owner:(\d{17,20})/);
  if (!owner) return null;
  const num = topic.match(/Ticket #(\d+)/);
  const cat = topic.match(/cat:(\w+)/);
  return setMeta(channel.id, {
    guildId: channel.guild.id,
    ownerId: owner[1],
    number: num ? parseInt(num[1], 10) : 0,
    category: cat ? cat[1] : 'other',
    status: channel.name.startsWith('closed-') ? 'closed' : 'open',
    claimedBy: null,
    createdAt: channel.createdTimestamp,
  });
}

function findOpenTickets(guild, userId) {
  const d = db();
  return Object.entries(d.channels)
    .filter(([id, m]) => m.guildId === guild.id && m.ownerId === userId && m.status === 'open' && guild.channels.cache.has(id))
    .map(([id]) => guild.channels.cache.get(id));
}

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  const roleId = settings.get(member.guild.id, 'ticketSupportRoleId');
  return Boolean(roleId && member.roles.cache.has(roleId));
}

async function logTicket(guild, { title, color, fields = [], transcript }) {
  const id = settings.get(guild.id, 'ticketLogChannelId');
  const channel = id && guild.channels.cache.get(id);
  if (!channel) return;
  const embed = new EmbedBuilder()
    .setColor(color ?? config.brand.color)
    .setTitle(title)
    .addFields(fields)
    .setTimestamp();
  await channel
    .send({ embeds: [embed], files: transcript ? [toAttachment(transcript)] : [] })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// UI builders
// ---------------------------------------------------------------------------
function buildPanel(guild) {
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle('✦ Support Tickets')
    .setDescription(
      'Need help or want to purchase? Select a category below and we\u2019ll create a private ticket for you.\n\n' +
        CATEGORIES.map((c) => `**${c.label}**\n${c.description}`).join('\n\n'),
    )
    .setFooter({ text: `${config.brand.name} • Please don't open tickets without a reason` });
  const icon = guild?.iconURL({ size: 256 });
  if (icon) embed.setThumbnail(icon);

  const menu = new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('Select a category')
    .addOptions(
      CATEGORIES.map((c) => ({ label: c.label, value: c.key, description: c.description, emoji: c.emoji })),
    );

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)] };
}

function buildModal(cat) {
  const modal = new ModalBuilder().setCustomId(`ticket_modal:${cat.key}`).setTitle(`${cat.label} ticket`.slice(0, 45));
  for (const q of cat.questions.slice(0, 5)) {
    const input = new TextInputBuilder()
      .setCustomId(q.id)
      .setLabel(q.label.slice(0, 45))
      .setStyle(q.long ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(q.required !== false)
      .setMaxLength(q.long ? 1000 : 100);
    if (q.placeholder) input.setPlaceholder(q.placeholder.slice(0, 100));
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

function openControls(claimedByName) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(claimedByName ? `Claimed by ${claimedByName}`.slice(0, 80) : 'Claim')
      .setEmoji('🙋')
      .setStyle(ButtonStyle.Success)
      .setDisabled(Boolean(claimedByName)),
  );
}

function closedControls() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen').setEmoji('🔓').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setEmoji('📄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setEmoji('🗑️').setStyle(ButtonStyle.Danger),
  );
}

// Purchase: pick version + duration. The choice is kept in the dropdowns
// themselves (selected option), so nothing has to be remembered in between.
function buildShop(version, duration, note) {
  const versionMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_buy_version')
    .setPlaceholder('Which version?')
    .addOptions(
      PRODUCTS.versions.slice(0, 25).map((v) => ({
        label: v.label,
        value: v.key,
        description: v.description || undefined,
        emoji: v.emoji || undefined,
        default: v.key === version,
      })),
    );
  const durationMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_buy_duration')
    .setPlaceholder('How long?')
    .addOptions(
      PRODUCTS.durations.slice(0, 25).map((d) => ({
        label: d.label,
        value: d.key,
        description: d.description || undefined,
        emoji: d.emoji || undefined,
        default: d.key === duration,
      })),
    );
  const button = new ButtonBuilder()
    .setCustomId('ticket_buy_open')
    .setLabel('Open purchase ticket')
    .setEmoji('🛒')
    .setStyle(ButtonStyle.Success)
    .setDisabled(!version || !duration);

  return {
    content: note || '**🛒 What do you want to buy?**\nPick a version and a duration, then open your ticket.',
    components: [
      new ActionRowBuilder().addComponents(versionMenu),
      new ActionRowBuilder().addComponents(durationMenu),
      new ActionRowBuilder().addComponents(button),
    ],
  };
}

// Reads the currently selected version/duration from a shop message.
function shopSelection(message) {
  const picked = (id) => {
    for (const row of message?.components || []) {
      for (const c of row.components || []) {
        if (c.customId === id) return c.options?.find((o) => o.default)?.value || null;
      }
    }
    return null;
  };
  return { version: picked('ticket_buy_version'), duration: picked('ticket_buy_duration') };
}

// Category a ticket belongs in: its own open/closed category if set,
// otherwise the general ticket category. Returns a category channel or null.
function parentFor(guild, cat, closed) {
  const asCategory = (key) => {
    const c = key && guild.channels.cache.get(settings.get(guild.id, key));
    return c?.type === ChannelType.GuildCategory ? c : null;
  };
  if (closed) return asCategory(cat.closedSetting) || null;
  return asCategory(cat.parentSetting) || asCategory('ticketCategoryId');
}

async function moveTicket(channel, cat, closed) {
  const target = parentFor(channel.guild, cat, closed);
  if (target && channel.parentId !== target.id) {
    await channel.setParent(target.id, { lockPermissions: false }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
async function createTicket(interaction, cat, answers) {
  const { guild, user } = interaction;
  const num = nextNumber(guild.id);
  const n = pad(num);
  const supportRoleId = settings.get(guild.id, 'ticketSupportRoleId');
  const supportRole = supportRoleId && guild.roles.cache.get(supportRoleId);
  const parent = parentFor(guild, cat, false);

  const memberPerms = [
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
  ];
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: memberPerms },
    {
      id: guild.members.me.id,
      allow: [...memberPerms, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages],
    },
  ];
  if (supportRole) overwrites.push({ id: supportRole.id, allow: memberPerms });

  const channel = await guild.channels.create({
    name: `${cat.prefix}-${n}`,
    type: ChannelType.GuildText,
    parent: parent?.id,
    topic: `Ticket #${n} | ${cat.label} | owner:${user.id} | cat:${cat.key}`,
    permissionOverwrites: overwrites,
    reason: `Ticket opened by ${user.tag}`,
  });

  setMeta(channel.id, {
    guildId: guild.id,
    ownerId: user.id,
    number: num,
    category: cat.key,
    status: 'open',
    claimedBy: null,
    createdAt: Date.now(),
  });

  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
    .setTitle(`${cat.emoji} ${cat.label} • Ticket #${n}`)
    .setDescription(`Hey ${user}, thanks for reaching out!\n${cat.welcome}`)
    .addFields(answers.map((a) => ({ name: a.label, value: a.value.slice(0, 1024) })))
    .setFooter({ text: `${config.brand.name} • Use the buttons below to manage this ticket` })
    .setTimestamp();

  await channel.send({
    content: `${user}${supportRole ? ` ${supportRole}` : ''}`,
    embeds: [embed],
    components: [openControls(null)],
    allowedMentions: { users: [user.id], roles: supportRole ? [supportRole.id] : [] },
  });

  logTicket(guild, {
    title: '🎫 Ticket opened',
    color: config.brand.success,
    fields: [
      { name: 'Ticket', value: `${channel} (#${n})`, inline: true },
      { name: 'Owner', value: `${user}`, inline: true },
      { name: 'Category', value: `${cat.emoji} ${cat.label}`, inline: true },
      { name: answers[0]?.label || 'Subject', value: (answers[0]?.value || '—').slice(0, 1024) },
    ],
  });

  return channel;
}

async function closeTicket(channel, closer, reason) {
  const t = getTicket(channel);
  if (!t || t.status !== 'open') return false;
  const { guild } = channel;
  const n = pad(t.number);

  setMeta(channel.id, { status: 'closed', closedBy: closer.id, closedAt: Date.now(), closeReason: reason || null });

  await channel.permissionOverwrites
    .edit(t.ownerId, { ViewChannel: false, SendMessages: false })
    .catch(() => {});
  // Renames are heavily rate-limited by Discord, so don't wait on them.
  channel.setName(`closed-${n}`).catch(() => {});
  await moveTicket(channel, category(t.category), true);

  const embed = new EmbedBuilder()
    .setColor(config.brand.danger)
    .setTitle('🔒 Ticket closed')
    .setDescription(`Closed by ${closer}${reason ? `\n**Reason:** ${reason}` : ''}`)
    .setFooter({ text: 'Staff: reopen, export a transcript or delete this ticket.' })
    .setTimestamp();
  await channel.send({ embeds: [embed], components: [closedControls()] });

  const transcript = await buildTranscript(channel, t).catch((err) => {
    console.error('[tickets] transcript failed:', err);
    return null;
  });

  const cat = category(t.category);
  logTicket(guild, {
    title: '🔒 Ticket closed',
    color: config.brand.danger,
    fields: [
      { name: 'Ticket', value: `#${n} (${cat.emoji} ${cat.label})`, inline: true },
      { name: 'Owner', value: `<@${t.ownerId}>`, inline: true },
      { name: 'Closed by', value: `${closer}`, inline: true },
      { name: 'Claimed by', value: t.claimedBy ? `<@${t.claimedBy}>` : '—', inline: true },
      { name: 'Opened', value: `<t:${Math.floor((t.createdAt || Date.now()) / 1000)}:R>`, inline: true },
      { name: 'Messages', value: `${transcript?.count ?? '?'}`, inline: true },
      ...(reason ? [{ name: 'Reason', value: reason.slice(0, 1024) }] : []),
    ],
    transcript,
  });

  const owner = await channel.client.users.fetch(t.ownerId).catch(() => null);
  if (owner) {
    const dm = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`Your ticket #${n} in ${guild.name} was closed`)
      .setDescription(`${reason ? `**Reason:** ${reason}\n\n` : ''}Thanks for contacting us! A transcript is attached.`)
      .setTimestamp();
    owner.send({ embeds: [dm], files: transcript ? [toAttachment(transcript)] : [] }).catch(() => {});
  }
  return true;
}

async function reopenTicket(interaction) {
  const channel = interaction.channel;
  const t = getTicket(channel);
  if (!t || t.status !== 'closed') {
    return interaction.reply({ content: 'This ticket is not closed.', flags: EPH });
  }
  const cat = category(t.category);
  setMeta(channel.id, { status: 'open', closedBy: null, closedAt: null, closeReason: null });

  await channel.permissionOverwrites
    .edit(t.ownerId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true })
    .catch(() => {});
  channel.setName(`${cat.prefix}-${pad(t.number)}`).catch(() => {});
  await moveTicket(channel, cat, false);

  await interaction.update({ components: [] });
  await channel.send({
    content: `<@${t.ownerId}>`,
    embeds: [
      new EmbedBuilder()
        .setColor(config.brand.success)
        .setTitle('🔓 Ticket reopened')
        .setDescription(`Reopened by ${interaction.user}`)
        .setTimestamp(),
    ],
    components: [openControls(t.claimedBy ? (await channel.client.users.fetch(t.claimedBy).catch(() => null))?.username : null)],
  });

  logTicket(channel.guild, {
    title: '🔓 Ticket reopened',
    color: config.brand.success,
    fields: [
      { name: 'Ticket', value: `${channel} (#${pad(t.number)})`, inline: true },
      { name: 'By', value: `${interaction.user}`, inline: true },
    ],
  });
}

async function deleteTicket(interaction) {
  const channel = interaction.channel;
  const t = getTicket(channel);
  await interaction.reply({ content: '🗑️ This ticket will be deleted in **5 seconds**…' });

  logTicket(channel.guild, {
    title: '🗑️ Ticket deleted',
    color: config.brand.danger,
    fields: [
      { name: 'Ticket', value: `#${pad(t?.number ?? 0)}`, inline: true },
      { name: 'Owner', value: t ? `<@${t.ownerId}>` : '—', inline: true },
      { name: 'Deleted by', value: `${interaction.user}`, inline: true },
    ],
  });

  setTimeout(() => {
    deleteMeta(channel.id);
    channel.delete(`Ticket deleted by ${interaction.user.tag}`).catch(() => {});
  }, 5000);
}

// ---------------------------------------------------------------------------
// Interaction entry points
// ---------------------------------------------------------------------------
async function onSelect(interaction) {
  const cat = CATEGORIES.find((c) => c.key === interaction.values[0]);
  if (!cat) return;

  const open = findOpenTickets(interaction.guild, interaction.user.id);
  if (open.length >= MAX_OPEN_PER_USER) {
    // Reset the dropdown, then tell the user privately.
    await interaction.update(buildPanel(interaction.guild));
    return interaction.followUp({ content: `You already have an open ticket: ${open[0]}`, flags: EPH });
  }
  if (cat.shop) {
    // Reset the panel dropdown and show the version/duration picker privately.
    await interaction.update(buildPanel(interaction.guild));
    return interaction.followUp({ ...buildShop(null, null), flags: EPH });
  }
  return interaction.showModal(buildModal(cat));
}

// Version or duration picked in the purchase picker.
async function onShopSelect(interaction) {
  const current = shopSelection(interaction.message);
  if (interaction.customId === 'ticket_buy_version') current.version = interaction.values[0];
  if (interaction.customId === 'ticket_buy_duration') current.duration = interaction.values[0];
  return interaction.update(buildShop(current.version, current.duration));
}

async function onShopOpen(interaction) {
  const { version, duration } = shopSelection(interaction.message);
  const v = PRODUCTS.versions.find((x) => x.key === version);
  const d = PRODUCTS.durations.find((x) => x.key === duration);
  if (!v || !d) return interaction.update(buildShop(version, duration, '⚠️ Please pick a version **and** a duration.'));

  const open = findOpenTickets(interaction.guild, interaction.user.id);
  if (open.length >= MAX_OPEN_PER_USER) {
    return interaction.update({ content: `You already have an open ticket: ${open[0]}`, components: [] });
  }

  await interaction.update({ content: '⏳ Creating your ticket…', components: [] });
  const cat = CATEGORIES.find((c) => c.shop);
  try {
    const channel = await createTicket(interaction, cat, [
      { label: 'Version', value: v.label },
      { label: 'Duration', value: d.label },
    ]);
    return interaction.editReply(`✅ Your purchase ticket has been created: ${channel}`);
  } catch (err) {
    console.error('[tickets] create failed:', err);
    return interaction.editReply(
      "❌ I couldn't create your ticket. Make sure I have the **Manage Channels** permission and my role is high enough.",
    );
  }
}

async function onModal(interaction) {
  const cat = CATEGORIES.find((c) => c.key === interaction.customId.split(':')[1]);
  if (!cat) return;
  await interaction.deferReply({ flags: EPH });

  // Reset the panel dropdown so the same option can be picked again.
  if (interaction.message) interaction.message.edit(buildPanel(interaction.guild)).catch(() => {});

  const open = findOpenTickets(interaction.guild, interaction.user.id);
  if (open.length >= MAX_OPEN_PER_USER) {
    return interaction.editReply(`You already have an open ticket: ${open[0]}`);
  }

  const answers = cat.questions.slice(0, 5).map((q) => ({
    label: q.label,
    value: interaction.fields.getTextInputValue(q.id)?.trim() || '—',
  }));

  try {
    const channel = await createTicket(interaction, cat, answers);
    return interaction.editReply(`✅ Your ticket has been created: ${channel}`);
  } catch (err) {
    console.error('[tickets] create failed:', err);
    return interaction.editReply(
      "❌ I couldn't create your ticket. Make sure I have the **Manage Channels** permission and my role is high enough.",
    );
  }
}

async function onButton(interaction) {
  const id = interaction.customId;
  const channel = interaction.channel;

  if (id === 'ticket_buy_open') return onShopOpen(interaction);

  // Legacy button from older panels
  if (id === 'ticket_open') {
    const open = findOpenTickets(interaction.guild, interaction.user.id);
    if (open.length >= MAX_OPEN_PER_USER) {
      return interaction.reply({ content: `You already have an open ticket: ${open[0]}`, flags: EPH });
    }
    return interaction.showModal(buildModal(CATEGORIES.find((c) => !c.shop) || CATEGORIES[0]));
  }

  const t = getTicket(channel);
  if (!t) return interaction.reply({ content: 'This is not a ticket channel.', flags: EPH });
  const staff = isStaff(interaction.member);

  switch (id) {
    case 'ticket_claim': {
      if (!staff) return interaction.reply({ content: 'Only staff can claim tickets.', flags: EPH });
      if (t.claimedBy) return interaction.reply({ content: `Already claimed by <@${t.claimedBy}>.`, flags: EPH });
      setMeta(channel.id, { claimedBy: interaction.user.id });
      await interaction.update({ components: [openControls(interaction.user.username)] });
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(config.brand.success)
            .setDescription(`🙋 ${interaction.user} has claimed this ticket and will assist you.`),
        ],
      });
      return logTicket(interaction.guild, {
        title: '🙋 Ticket claimed',
        fields: [
          { name: 'Ticket', value: `${channel} (#${pad(t.number)})`, inline: true },
          { name: 'Staff', value: `${interaction.user}`, inline: true },
        ],
      });
    }

    case 'ticket_close': {
      if (t.status !== 'open') return interaction.reply({ content: 'This ticket is already closed.', flags: EPH });
      if (!staff && interaction.user.id !== t.ownerId) {
        return interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', flags: EPH });
      }
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Yes, close it').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({ content: 'Are you sure you want to close this ticket?', components: [row], flags: EPH });
    }

    case 'ticket_close_confirm': {
      await interaction.update({ content: '🔒 Closing ticket…', components: [] });
      const ok = await closeTicket(channel, interaction.user, null);
      if (!ok) await interaction.editReply({ content: 'This ticket is already closed.' }).catch(() => {});
      return;
    }

    case 'ticket_close_cancel':
      return interaction.update({ content: 'Cancelled.', components: [] });

    case 'ticket_reopen':
      if (!staff) return interaction.reply({ content: 'Only staff can reopen tickets.', flags: EPH });
      return reopenTicket(interaction);

    case 'ticket_transcript': {
      if (!staff) return interaction.reply({ content: 'Only staff can export transcripts.', flags: EPH });
      await interaction.deferReply({ flags: EPH });
      const transcript = await buildTranscript(channel, t);
      return interaction.editReply({ content: `📄 Transcript (${transcript.count} messages):`, files: [toAttachment(transcript)] });
    }

    case 'ticket_delete':
      if (!staff) return interaction.reply({ content: 'Only staff can delete tickets.', flags: EPH });
      return deleteTicket(interaction);

    default:
      return undefined;
  }
}

module.exports = {
  buildPanel,
  getTicket,
  isStaff,
  closeTicket,
  deleteMeta,
  onSelect,
  onShopSelect,
  onModal,
  onButton,
};
