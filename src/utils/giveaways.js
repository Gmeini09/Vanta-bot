// Persistent giveaways: stored on disk and re-scheduled after a restart.
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const store = require('./store');

const NAME = 'giveaways';
const EMOJI = '🎉';
const MAX_DELAY = 2 ** 31 - 1; // setTimeout limit (~24.8 days)

function all() {
  return store.read(NAME);
}
function update(id, patch) {
  const d = all();
  d[id] = { ...(d[id] || {}), ...patch };
  store.write(NAME, d);
  return d[id];
}

async function pickWinners(message, count, exclude = []) {
  const reaction = message.reactions.cache.get(EMOJI);
  if (!reaction) return [];
  const users = [];
  let after;
  for (;;) {
    const batch = await reaction.users.fetch({ limit: 100, after });
    if (!batch.size) break;
    users.push(...batch.values());
    after = batch.last().id;
    if (batch.size < 100) break;
  }
  const pool = users.filter((u) => !u.bot && !exclude.includes(u.id));
  const winners = [];
  while (winners.length < count && pool.length) {
    winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return winners;
}

function buildEmbed(g, { ended = false, winners = [] } = {}) {
  const embed = new EmbedBuilder()
    .setColor(ended ? config.brand.success : config.brand.color)
    .setTitle(`${EMOJI} ${ended ? 'Giveaway ended' : 'Giveaway'}: ${g.prize}`)
    .setTimestamp(g.endsAt);
  if (ended) {
    embed.setDescription(
      `**Winner${g.winners > 1 ? 's' : ''}:** ${winners.length ? winners.join(', ') : 'No valid entrants'}\n` +
        `Hosted by <@${g.hostId}>`,
    );
  } else {
    embed.setDescription(
      `React with ${EMOJI} to enter!\n\n` +
        `**Winners:** ${g.winners}\n**Ends:** <t:${Math.floor(g.endsAt / 1000)}:R>\n**Hosted by:** <@${g.hostId}>`,
    );
  }
  return embed.setFooter({ text: ended ? 'Ended' : 'Ends' });
}

async function end(client, id) {
  const g = all()[id];
  if (!g || g.ended) return null;
  update(id, { ended: true });

  const channel = await client.channels.fetch(g.channelId).catch(() => null);
  const message = channel && (await channel.messages.fetch(id).catch(() => null));
  if (!message) return null;

  const winners = await pickWinners(message, g.winners);
  update(id, { winnerIds: winners.map((u) => u.id) });

  await message.edit({ embeds: [buildEmbed(g, { ended: true, winners })] }).catch(() => {});
  await message
    .reply(
      winners.length
        ? `${EMOJI} Congratulations ${winners.join(', ')}! You won **${g.prize}**!`
        : `No valid entrants for **${g.prize}**.`,
    )
    .catch(() => {});
  return winners;
}

function schedule(client, id) {
  const g = all()[id];
  if (!g || g.ended) return;
  const delay = g.endsAt - Date.now();
  if (delay > MAX_DELAY) {
    setTimeout(() => schedule(client, id), MAX_DELAY);
    return;
  }
  setTimeout(() => end(client, id).catch((err) => console.error('[giveaway]', err)), Math.max(0, delay));
}

function create(client, id, data) {
  update(id, { ...data, ended: false });
  schedule(client, id);
}

function resumeAll(client) {
  const pending = Object.entries(all()).filter(([, g]) => !g.ended);
  for (const [id] of pending) schedule(client, id);
  if (pending.length) console.log(`[giveaway] resumed ${pending.length} running giveaway(s).`);
}

module.exports = { EMOJI, buildEmbed, create, end, pickWinners, resumeAll, get: (id) => all()[id] };
