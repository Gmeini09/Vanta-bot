// Remembers every channel/category the bot creates itself, per server,
// so /delete-bot-channels can remove exactly those again.
const store = require('./store');

const NAME = 'created-channels';

function add(guildId, channelId) {
  if (!guildId || !channelId) return;
  const d = store.read(NAME);
  d[guildId] = [...new Set([...(d[guildId] || []), channelId])];
  store.write(NAME, d);
}

function list(guildId) {
  return store.read(NAME)[guildId] || [];
}

function forget(guildId, ids) {
  const d = store.read(NAME);
  if (!d[guildId]) return;
  const gone = new Set(ids);
  d[guildId] = d[guildId].filter((id) => !gone.has(id));
  store.write(NAME, d);
}

module.exports = { add, list, forget };
