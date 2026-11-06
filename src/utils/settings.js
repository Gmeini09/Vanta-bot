// Per-server settings. Values set with /settings or /setup-server are stored in
// the data dir and win over the environment variables, which act as defaults.
const store = require('./store');
const config = require('../config');

const NAME = 'settings';

function envDefaults() {
  return {
    welcomeChannelId: config.welcome.channelId,
    leaveChannelId: config.leave.channelId,
    modLogChannelId: config.modLogChannelId,
    autoRoleId: config.autoRoleId,
    ticketCategoryId: config.tickets.categoryId,
    ticketSupportRoleId: config.tickets.supportRoleId,
    ticketLogChannelId: config.tickets.logChannelId,
  };
}

const KEYS = Object.keys(envDefaults());

function getAll(guildId) {
  const saved = store.read(NAME)[guildId] || {};
  const env = envDefaults();
  const out = {};
  for (const key of KEYS) out[key] = saved[key] || env[key] || '';
  // Leave messages fall back to the welcome channel.
  if (!out.leaveChannelId) out.leaveChannelId = out.welcomeChannelId;
  // Ticket logs fall back to the mod-log channel.
  if (!out.ticketLogChannelId) out.ticketLogChannelId = out.modLogChannelId;
  return out;
}

function get(guildId, key) {
  return getAll(guildId)[key] || '';
}

function set(guildId, patch) {
  const data = store.read(NAME);
  data[guildId] = { ...(data[guildId] || {}), ...patch };
  store.write(NAME, data);
}

function reset(guildId, key) {
  const data = store.read(NAME);
  if (data[guildId]) {
    delete data[guildId][key];
    store.write(NAME, data);
  }
}

module.exports = { KEYS, get, getAll, set, reset };
