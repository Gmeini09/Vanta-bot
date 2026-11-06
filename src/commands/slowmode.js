const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for this channel.')
    .addIntegerOption((o) =>
      o
        .setName('seconds')
        .setDescription('Seconds between messages (0 to disable, max 21600)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    await interaction.channel.setRateLimitPerSecond(seconds);
    return interaction.reply({
      content: seconds === 0 ? '🐇 Slowmode disabled.' : `🐢 Slowmode set to **${seconds}s**.`,
    });
  },
};
