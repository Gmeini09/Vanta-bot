const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot send a message in this channel.')
    .addStringOption((o) => o.setName('message').setDescription('What to say').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const message = interaction.options.getString('message');
    await interaction.channel.send({ content: message, allowedMentions: { parse: [] } });
    return interaction.reply({ content: 'Sent.', ephemeral: true });
  },
};
