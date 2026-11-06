const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const giveaways = require('../utils/giveaways');

const EPH = MessageFlags.Ephemeral;
const UNITS = { m: 60_000, h: 3_600_000, d: 86_400_000 };

function parseDuration(raw) {
  const m = raw.trim().toLowerCase().match(/^(\d+)\s*(m|h|d)$/);
  return m ? parseInt(m[1], 10) * UNITS[m[2]] : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Run giveaways.')
    .addSubcommand((s) =>
      s
        .setName('start')
        .setDescription('Start a giveaway in this channel.')
        .addStringOption((o) => o.setName('prize').setDescription('What is being given away').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('duration').setDescription('e.g. 30m, 2h, 1d (max 60d)').setRequired(true))
        .addIntegerOption((o) => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20)),
    )
    .addSubcommand((s) =>
      s
        .setName('end')
        .setDescription('End a running giveaway now.')
        .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('reroll')
        .setDescription('Pick a new winner for a finished giveaway.')
        .addStringOption((o) => o.setName('message_id').setDescription('Giveaway message ID').setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const duration = parseDuration(interaction.options.getString('duration'));
      const winners = interaction.options.getInteger('winners') || 1;

      if (!duration) {
        return interaction.reply({ content: 'Invalid duration. Use e.g. `30m`, `2h`, `1d`.', flags: EPH });
      }
      if (duration > 60 * UNITS.d) {
        return interaction.reply({ content: 'Maximum duration is 60 days.', flags: EPH });
      }

      const data = {
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        prize,
        winners,
        hostId: interaction.user.id,
        endsAt: Date.now() + duration,
      };

      await interaction.reply({ content: '🎉 Giveaway started!', flags: EPH });
      const msg = await interaction.channel.send({ embeds: [giveaways.buildEmbed(data)] });
      await msg.react(giveaways.EMOJI);
      giveaways.create(interaction.client, msg.id, data);
      return;
    }

    const id = interaction.options.getString('message_id').trim();
    const g = giveaways.get(id);
    if (!g) return interaction.reply({ content: 'No giveaway found with that message ID.', flags: EPH });

    if (sub === 'end') {
      if (g.ended) return interaction.reply({ content: 'That giveaway has already ended.', flags: EPH });
      await interaction.reply({ content: 'Ending giveaway…', flags: EPH });
      await giveaways.end(interaction.client, id);
      return;
    }

    // reroll
    if (!g.ended) return interaction.reply({ content: 'That giveaway is still running.', flags: EPH });
    const channel = await interaction.client.channels.fetch(g.channelId).catch(() => null);
    const msg = channel && (await channel.messages.fetch(id).catch(() => null));
    if (!msg) return interaction.reply({ content: 'Could not find the giveaway message.', flags: EPH });

    const [winner] = await giveaways.pickWinners(msg, 1, g.winnerIds || []);
    if (!winner) return interaction.reply({ content: 'No other valid entrants to reroll.', flags: EPH });
    return interaction.reply({ content: `${giveaways.EMOJI} New winner: ${winner}! You won **${g.prize}**!` });
  },
};
