// Persistent per-guild, per-user warnings.
const store = require('./store');
const NAME = 'warnings';

function all() {
  return store.read(NAME);
}

function get(guildId, userId) {
  const data = all();
  return data[guildId]?.[userId] || [];
}

function add(guildId, userId, entry) {
  const data = all();
  data[guildId] ??= {};
  data[guildId][userId] ??= [];
  data[guildId][userId].push(entry);
  store.write(NAME, data);
  return data[guildId][userId].length;
}

function clear(guildId, userId) {
  const data = all();
  if (data[guildId]) {
    delete data[guildId][userId];
    store.write(NAME, data);
  }
}

module.exports = { get, add, clear };
