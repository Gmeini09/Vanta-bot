const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const SALE = require('../sale');
const PLANS = require('../plans');

const TITLE = () => `🔥 ${SALE.percent}% OFF — Limited Time`;
const isActive = () => Date.now() < SALE.endsAt * 1000;

// "55 USD" -> "~~55 USD~~ **27.50 USD**"
function discounted(price) {
  const m = price.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return price;
  const v = (Number(m[1]) * (100 - SALE.percent)) / 100;
  const out = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return `~~${price}~~ **${out} ${m[2]}**`;
}

function buildSalePanel(guild) {
  if (!isActive()) return null;
  const sections = SALE.plans
    .filter((k) => PLANS[k])
    .map((k) => {
      const plan = PLANS[k];
      const name = plan.title.replace(/^\S+\s+/, '');
      return `__**${name}**__\n` + plan.pricing.map((p) => `*${p.label}*\n${p.prices.map((x) => `• ${discounted(x)}`).join('\n')}`).join('\n\n');
    });

  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(TITLE())
    .setDescription(
      `**${SALE.percent}% off all plans!**\n` +
        `⏳ Ends <t:${SALE.endsAt}:R> (<t:${SALE.endsAt}:f>)\n\n` +
        sections.join('\n\n') +
        '\n\nTo buy, open a **Purchase** ticket.',
    )
    .setFooter({ text: `${config.brand.name} • No refunds once paid` });
  const icon = guild?.client.user.displayAvatarURL({ size: 256 }) || guild?.iconURL({ size: 256 });
  if (icon) embed.setThumbnail(icon);
  return { embeds: [embed], components: [] };
}

const isSalePanel = (m) => m.embeds?.[0]?.title?.includes('% OFF');

module.exports = { buildSalePanel, isSalePanel, isActive, endsAt: () => SALE.endsAt * 1000 };
