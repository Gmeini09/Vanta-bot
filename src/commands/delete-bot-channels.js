const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AuditLogEvent,
  ChannelType,
} = require('discord.js');
const config = require('../config');
const created = require('../utils/created');
const panels = require('../server/panels');
const { clearLayout } = require('../server/sync');

// Channels the bot created: the ones it tracked itself, plus everything the
// audit log shows it created (Discord keeps the audit log for 45 days).
async function findBotChannels(guild) {
  const ids = new Set(created.list(guild.id));
  let before;
  for (let page = 0; page < 20; page++) {
    const logs = await guild
      .fetchAuditLogs({ type: AuditLogEvent.ChannelCreate, user: guild.client.user, limit: 100, before })
      .catch(() => null);
    if (!logs?.entries.size) break;
    for (const e of logs.entries.values()) if (e.targetId) ids.add(e.targetId);
    if (logs.entries.size < 100) break;
    before = logs.entries.last().id;
  }
  return [...ids].map((id) => guild.channels.cache.get(id)).filter(Boolean);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete-bot-channels')
    .setDescription('Delete every channel and category the bot created itself.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { guild } = interaction;
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission to use this.', flags: MessageFlags.Ephemeral });
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channels = await findBotChannels(guild);
    if (!channels.length) {
      return interaction.editReply('✅ No channels found that I created — nothing to delete.');
    }

    // A category is only deleted if nothing that the bot didn't create is left inside.
    const mine = new Set(channels.map((c) => c.id));
    const cats = channels.filter((c) => c.type === ChannelType.GuildCategory);
    const others = channels.filter((c) => c.type !== ChannelType.GuildCategory);
    const keptCats = cats.filter((cat) => guild.channels.cache.some((c) => c.parentId === cat.id && !mine.has(c.id)));

    const preview = [...others, ...cats]
      .map((c) => (c.type === ChannelType.GuildCategory ? `📁 ${c.name}` : `# ${c.name}`))
      .slice(0, 40)
      .join('\n');
    const warn = new EmbedBuilder()
      .setColor(config.brand.danger)
      .setTitle(`🗑️ Delete ${channels.length - keptCats.length} channel(s)?`)
      .setDescription(
        `These were created by me:\n\`\`\`\n${preview}${channels.length > 40 ? `\n… and ${channels.length - 40} more` : ''}\n\`\`\`` +
          (keptCats.length
            ? `\n📁 Kept (still contain your own channels): ${keptCats.map((c) => `**${c.name}**`).join(', ')}\n`
            : '') +
          '\nChannels you made yourself are not touched. **This cannot be undone.**',
      );
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('botch_confirm').setLabel('Yes, delete them').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('botch_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );
    const message = await interaction.editReply({ embeds: [warn], components: [buttons] });

    let choice;
    try {
      choice = await message.awaitMessageComponent({ filter: (i) => i.user.id === interaction.user.id, time: 60_000 });
    } catch {
      return interaction.editReply({ content: 'Timed out — nothing deleted.', embeds: [], components: [] }).catch(() => {});
    }
    if (choice.customId === 'botch_cancel') {
      return choice.update({ content: 'Cancelled — nothing deleted.', embeds: [], components: [] });
    }
    await choice.update({ content: '🗑️ Deleting…', embeds: [], components: [] });

    const reason = `/delete-bot-channels by ${interaction.user.tag}`;
    const deleted = [];
    let failed = 0;
    const kept = new Set(keptCats.map((c) => c.id));
    for (const c of [...others, ...cats.filter((c) => !kept.has(c.id))]) {
      if (!c.deletable) {
        failed++;
        continue;
      }
      if (await c.delete(reason).then(() => true).catch(() => false)) deleted.push(c.id);
      else failed++;
    }
    created.forget(guild.id, deleted);

    // The bot layout is gone, so forget it (the next /setup-server starts fresh).
    clearLayout(guild.id);
    panels.clearGuild(guild.id);

    const text =
      `✅ Deleted **${deleted.length}** channel(s)` +
      (failed ? `, ${failed} could not be deleted` : '') +
      (kept.size ? `, kept ${kept.size} category(ies) with your own channels` : '') +
      '.\nRun `/setup-server` if you want the layout built again.';
    // The reply is gone if the command was used in one of the deleted channels — DM instead.
    await interaction.editReply({ content: text }).catch(() => interaction.user.send(text).catch(() => {}));
  },
};
