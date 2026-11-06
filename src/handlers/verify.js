// Reaction verification: members react with ✅ on the verify panel and get the
// Member role (setting verifiedRoleId), which unlocks the rest of the server.
const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const settings = require('../utils/settings');
const store = require('../utils/store');

const EMOJI = '✅';
const TITLE = '✅ Verification';

function buildVerifyPanel(guild) {
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(TITLE)
    .setDescription(
      `Welcome to **${guild?.name ?? 'the server'}**!\n\n` +
        `React with ${EMOJI} below to verify and unlock the rest of the server.\n` +
        'By verifying you agree to the rules.',
    )
    .setFooter({ text: config.brand.name });
  const icon = guild?.iconURL({ size: 256 });
  if (icon) embed.setThumbnail(icon);
  return { embeds: [embed], components: [] };
}

const isVerifyPanel = (message) => message.embeds?.[0]?.title === TITLE;

function isTrackedPanel(guildId, messageId) {
  const list = store.read('panels')[guildId]?.verify || [];
  return list.some((e) => e.messageId === messageId);
}

async function onReactionAdd(reaction, user) {
  if (user.bot) return;
  if (reaction.partial) await reaction.fetch().catch(() => null);
  const message = reaction.message;
  const guild = message.guild;
  if (!guild || reaction.emoji.name !== EMOJI) return;
  if (!isTrackedPanel(guild.id, message.id)) return;

  const removeReaction = () => reaction.users.remove(user.id).catch(() => {});
  const roleId = settings.get(guild.id, 'verifiedRoleId');
  const role = roleId && guild.roles.cache.get(roleId);
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member || !role) return removeReaction();

  if (role.position >= guild.members.me.roles.highest.position) {
    console.warn(`[verify] ${guild.name}: can't give ${role.name} — move the bot role above it.`);
    return removeReaction();
  }

  if (!member.roles.cache.has(role.id)) {
    await member.roles.add(role, 'Verified via reaction').catch((err) => console.error('[verify]', err));
  }
  // Keep the panel clean: only the bot's own ✅ stays.
  removeReaction();
}

module.exports = { EMOJI, buildVerifyPanel, isVerifyPanel, onReactionAdd };
