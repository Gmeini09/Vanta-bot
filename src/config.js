// Central configuration. Everything sensitive comes from environment variables
// (set these in Railway, never commit them). Non-secret IDs can be set via env too.
require('dotenv').config();

module.exports = {
  // Required secrets
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,

  // Bot username (changed automatically on start if different).
  botName: process.env.BOT_NAME || 'Vanta',

  // The only server the bot works in. In every other server it stays a member
  // but does nothing (no commands, no layout sync, no messages).
  activeGuildId: process.env.ACTIVE_GUILD_ID || '1531989453168578650',

  // Optional: register slash commands to a single guild (instant) instead of
  // globally (can take up to 1h). Leave empty for global.
  guildId: process.env.GUILD_ID || '',

  // Where persistent data (warnings, giveaways) is stored. On Railway, attach a
  // Volume mounted at /data and set DATA_DIR=/data so it survives redeploys.
  dataDir: process.env.DATA_DIR || './data',

  // Welcome / leave messages
  welcome: {
    channelId: process.env.WELCOME_CHANNEL_ID || '',
  },
  leave: {
    // Falls back to the welcome channel if not set.
    channelId: process.env.LEAVE_CHANNEL_ID || process.env.WELCOME_CHANNEL_ID || '',
  },

  // Role automatically given to new members. Empty = disabled.
  autoRoleId: process.env.AUTOROLE_ID || '',

  // Channel where moderation actions are logged. Empty = disabled.
  modLogChannelId: process.env.MODLOG_CHANNEL_ID || '',

  // Ticket system
  tickets: {
    categoryId: process.env.TICKET_CATEGORY_ID || '',
    supportRoleId: process.env.TICKET_SUPPORT_ROLE_ID || '',
    logChannelId: process.env.TICKET_LOG_CHANNEL_ID || '',
  },

  // Role button panel: map a custom button id -> role ID.
  roleButtons: parseJSON(process.env.ROLE_BUTTONS, {
    role_announcements: '',
    role_gamer: '',
  }),

  // Branding
  brand: {
    name: 'Vanta',
    color: 0x8B5CF6, // purple
    success: 0x22C55E,
    danger: 0xEF4444,
    warn: 0xF59E0B,
  },
};

function parseJSON(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[config] invalid JSON in env var, using fallback.');
    return fallback;
  }
}
