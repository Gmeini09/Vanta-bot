const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot latency.'),
  async execute(interaction, client) {
    await interaction.reply({ content: 'Pinging…', ephemeral: true });
    const sent = await interaction.fetchReply();
    const rtt = sent.createdTimestamp - interaction.createdTimestamp;
    return interaction.editReply(
      `🏓 Pong! Roundtrip **${rtt}ms** · WebSocket **${Math.round(client.ws.ping)}ms**`,
    );
  },
};
