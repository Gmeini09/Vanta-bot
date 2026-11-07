// Keeps track of posted panels (rules, tickets) so they can be updated in place
// instead of re-posted. Panels are refreshed automatically on every start.
const store = require('../utils/store');

const NAME = 'panels';
const MARKERS = { rules: ['rules_accept'], tickets: ['ticket_select', 'ticket_open'], verify: [], 'plan-private': [] };

const hasMarker = (m, type) =>
  type === 'verify'
    ? require('../handlers/verify').isVerifyPanel(m)
    : type.startsWith('plan-')
    ? require('../handlers/plans').isPlanPanel(type.slice(5))(m)
    : m.components.some((row) => row.components?.some((c) => MARKERS[type].includes(c.customId)));

// The verify panel works with a reaction the bot keeps on the message.
async function afterPost(type, message) {
  if (type === 'verify') await message.react(require('../handlers/verify').EMOJI).catch(() => {});
}

function build(type, guild) {
  if (type === 'rules') return require('../handlers/rules').buildRulesPanel(guild);
  if (type === 'tickets') return require('../tickets/manager').buildPanel(guild);
  if (type === 'verify') return require('../handlers/verify').buildVerifyPanel(guild);
  if (type.startsWith('plan-')) return require('../handlers/plans').buildPlanPanel(type.slice(5), guild);
  return null;
}

function entries(guildId, type) {
  return store.read(NAME)[guildId]?.[type] || [];
}

function register(guildId, type, channelId, messageId) {
  const d = store.read(NAME);
  d[guildId] ??= {};
  d[guildId][type] = (d[guildId][type] || []).filter((e) => e.channelId !== channelId);
  d[guildId][type].push({ channelId, messageId });
  store.write(NAME, d);
}

function unregister(guildId, type, messageId) {
  const d = store.read(NAME);
  if (!d[guildId]?.[type]) return;
  d[guildId][type] = d[guildId][type].filter((e) => e.messageId !== messageId);
  store.write(NAME, d);
}

function clearGuild(guildId) {
  const d = store.read(NAME);
  delete d[guildId];
  store.write(NAME, d);
}

// Finds an older panel the bot posted in this channel (before panels were tracked).
async function findExisting(channel, type) {
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!recent) return null;
  return (
    recent.find(
      (m) =>
        m.author.id === channel.client.user.id && hasMarker(m, type),
    ) || null
  );
}

// Posts the panel in `channel`, or updates the one that is already there.
// Returns 'updated' | 'posted' | null.
async function ensure(guild, type, channel) {
  const payload = build(type, guild);
  const entry = entries(guild.id, type).find((e) => e.channelId === channel.id);

  let message = entry ? await channel.messages.fetch(entry.messageId).catch(() => null) : null;
  if (!message) message = await findExisting(channel, type);

  if (message) {
    const ok = await message.edit(payload).then(() => true).catch(() => false);
    if (ok) {
      register(guild.id, type, channel.id, message.id);
      await afterPost(type, message);
      return 'updated';
    }
  }

  const sent = await channel.send(payload).catch(() => null);
  if (!sent) return null;
  register(guild.id, type, channel.id, sent.id);
  await afterPost(type, sent);
  return 'posted';
}

// Re-renders every tracked panel of a guild with the current code.
async function refreshAll(guild) {
  let count = 0;
  for (const type of Object.keys(MARKERS)) {
    for (const e of entries(guild.id, type)) {
      const channel = guild.channels.cache.get(e.channelId);
      const message = channel && (await channel.messages.fetch(e.messageId).catch(() => null));
      if (!message) {
        unregister(guild.id, type, e.messageId);
        continue;
      }
      if (await message.edit(build(type, guild)).then(() => true).catch(() => false)) {
        await afterPost(type, message);
        count++;
      }
    }
  }
  return count;
}

module.exports = { ensure, register, refreshAll, clearGuild };
