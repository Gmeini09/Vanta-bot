const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const PLANS = require('../plans');

function buildPlanPanel(key, guild) {
  const plan = PLANS[key];
  const list = (items) => items.map((i) => `• ${i}`).join('\n');
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(plan.title)
    .setDescription(
      `*Features*\n\n${list(plan.features)}\n\n` +
        `*Pricing:*\n\n` +
        plan.pricing.map((p) => `*${p.label}*\n${list(p.prices)}`).join('\n\n') +
        '\n\nTo buy, open a **Purchase** ticket.',
    )
    .setFooter({ text: `${config.brand.name} • No refunds once paid` });
  const icon = guild?.iconURL({ size: 256 });
  if (icon) embed.setThumbnail(icon);
  return { embeds: [embed], components: [] };
}

const isPlanPanel = (key) => (message) => message.embeds?.[0]?.title === PLANS[key]?.title;

module.exports = { buildPlanPanel, isPlanPanel };
