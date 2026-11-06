// Central configuration. Everything sensitive comes from environment variables
// (set these in Railway, never commit them). Non-secret IDs can be set via env too.
require('dotenv').config();

module.exports = {
  // Required secrets
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,

  // Optional: register slash commands to a single guild (instant) instead of
  // globally (can take up to 1h). Leave empty for global.
  guildId: process.env.GUILD_ID || '',

  // Welcome messages
  welcome: {
    // Channel ID where new members are greeted. Empty = disabled.
    channelId: process.env.WELCOME_CHANNEL_ID || '',
  },

  // Ticket system
  tickets: {
    // Category ID under which ticket channels are created. Empty = created at top level.
    categoryId: process.env.TICKET_CATEGORY_ID || '',
    // Role ID that can see/manage tickets (staff). Empty = only admins.
    supportRoleId: process.env.TICKET_SUPPORT_ROLE_ID || '',
  },

  // Role button panel: map a custom button id -> role ID.
  // Edit these IDs to match your server, or configure via the ROLE_BUTTONS env
  // var as JSON, e.g. {"role_gamer":"123","role_news":"456"}.
  roleButtons: parseRoleButtons(process.env.ROLE_BUTTONS),

  // Branding
  brand: {
    name: 'Vanta',
    color: 0x8B5CF6, // purple
  },
};

function parseRoleButtons(raw) {
  if (!raw) {
    // Defaults — replace the example role IDs with real ones on your server.
    return {
      // customId         roleId
      role_announcements: '',
      role_gamer: '',
    };
  }
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[config] ROLE_BUTTONS is not valid JSON, ignoring.');
    return {};
  }
}
