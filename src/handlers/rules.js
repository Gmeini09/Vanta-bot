const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const config = require('../config');
const settings = require('../utils/settings');
const RULES = require('../rules');

const EPH = MessageFlags.Ephemeral;

function buildRulesPanel(guild) {
  const embed = new EmbedBuilder()
    .setColor(config.brand.color)
    .setTitle(RULES.title)
    .setDescription(
      `${RULES.intro}\n\n` +
        RULES.rules.map((r, i) => `**${i + 1}. ${r.emoji} ${r.title}**\n${r.text}`).join('\n\n'),
    )
    .setFooter({ text: RULES.footer });
  const icon = guild?.iconURL({ size: 256 });
  if (icon) embed.setThumbnail(icon);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rules_accept').setLabel('Accept rules').setEmoji('✅').setStyle(ButtonStyle.Success),
  );
  return { embeds: [embed], components: [row] };
}

async function onAccept(interaction) {
  const roleId = settings.get(interaction.guild.id, 'verifiedRoleId');
  const role = roleId && interaction.guild.roles.cache.get(roleId);

  if (!role) {
    return interaction.reply({ content: '✅ Thanks for reading the rules!', flags: EPH });
  }
  if (interaction.member.roles.cache.has(role.id)) {
    return interaction.reply({ content: '✅ You have already accepted the rules.', flags: EPH });
  }
  if (role.position >= interaction.guild.members.me.roles.highest.position) {
    return interaction.reply({
      content: "I can't give you the role — ask an admin to move my role above it.",
      flags: EPH,
    });
  }

  await interaction.member.roles.add(role, 'Accepted the rules');
  return interaction.reply({
    content: `✅ Thanks for accepting the rules! You now have the ${role} role and can see the rest of the server.`,
    flags: EPH,
  });
}

module.exports = { buildRulesPanel, onAccept };
