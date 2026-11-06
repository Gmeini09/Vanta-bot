const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');

const UNITS = { m: 60_000, h: 3_600_000, d: 86_400_000 };
const EMOJI = '🎉';

function parseDuration(raw) {
  const m = raw.trim().toLowerCase().match(/^(\d+)(m|h|d)$/);
  return m ? parseInt(m[1], 10) * UNITS[m[2]] : null;
}

async function pickWinners(message, count) {
  const reaction = message.reactions.cache.get(EMOJI);
  if (!reaction) return [];
  const users = await reaction.users.fetch();
  const entrants = [...users.values()].filter((u) => !u.bot);
  const winners = [];
  while (winners.length < count && entrants.length) {
    winners.push(entrants.splice(Math.floor(Math.random() * entrants.length), 1)[0]);
  }
  return winners;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Run a giveaway.')
    .addSubcommand((s) =>
      s
        .setName('start')
        .setDescription('Start a giveaway.')
        .addStringOption((o) => o.setName('prize').setDescription('What is being given away').setRequired(true))
        .addStringOption((o) => o.setName('duration').setDescription('e.g. 30m, 2h, 1d').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20)),
    )
    .addSubcommand((s) =>
      s
        .setName('reroll')
        .setDescription('Reroll the winner of a finished giveaway.')
        .addStringOption((o) => o.setName('message_id').setDescription('The giveaway message ID').setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'reroll') {
      const id = interaction.options.getString('message_id').trim();
      const msg = await interaction.channel.messages.fetch(id).catch(() => null);
      if (!msg) return interaction.reply({ content: 'Message not found in this channel.', ephemeral: true });
      const [winner] = await pickWinners(msg, 1);
      if (!winner) return interaction.reply({ content: 'No valid entrants to reroll.', ephemeral: true });
      return interaction.reply({ content: `🎉 New winner: ${winner}! Congratulations!` });
    }

    const prize = interaction.options.getString('prize');
    const duration = parseDuration(interaction.options.getString('duration'));
    const winnerCount = interaction.options.getInteger('winners') || 1;

    if (!duration) {
      return interaction.reply({ content: 'Invalid duration. Use e.g. `30m`, `2h`, `1d`.', ephemeral: true });
    }

    const endsAt = Math.floor((Date.now() + duration) / 1000);
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`🎉 Giveaway: ${prize}`)
      .setDescription(
        `React with ${EMOJI} to enter!\n\n` +
          `Winners: **${winnerCount}**\nEnds: <t:${endsAt}:R>\nHosted by: ${interaction.user}`,
      )
      .setTimestamp(Date.now() + duration);

    await interaction.reply({ content: 'Giveaway started!', ephemeral: true });
    const msg = await interaction.channel.send({ embeds: [embed] });
    await msg.react(EMOJI);

    setTimeout(async () => {
      const fresh = await msg.fetch().catch(() => null);
      if (!fresh) return;
      const winners = await pickWinners(fresh, winnerCount);

      const ended = EmbedBuilder.from(embed)
        .setColor(config.brand.success)
        .setDescription(
          `Giveaway ended!\n\nPrize: **${prize}**\n` +
            `Winners: ${winners.length ? winners.join(', ') : 'No valid entrants'}`,
        );
      await fresh.edit({ embeds: [ended] }).catch(() => {});

      if (winners.length) {
        await interaction.channel
          .send(`🎉 Congratulations ${winners.join(', ')}! You won **${prize}**!`)
          .catch(() => {});
      }
    }, duration);
  },
};
