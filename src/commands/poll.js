const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

const LETTERS = ['🇦', '🇧', '🇨', '🇩', '🇪'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a reaction poll (up to 5 options).')
    .addStringOption((o) => o.setName('question').setDescription('The poll question').setRequired(true))
    .addStringOption((o) => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption((o) => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption((o) => o.setName('option3').setDescription('Option 3'))
    .addStringOption((o) => o.setName('option4').setDescription('Option 4'))
    .addStringOption((o) => o.setName('option5').setDescription('Option 5')),

  async execute(interaction) {
    const question = interaction.options.getString('question');
    const options = [];
    for (let i = 1; i <= 5; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`📊 ${question}`)
      .setDescription(options.map((o, i) => `${LETTERS[i]} ${o}`).join('\n\n'))
      .setFooter({ text: `Poll by ${interaction.user.tag}` });

    await interaction.reply({ content: 'Poll created.', ephemeral: true });
    const msg = await interaction.channel.send({ embeds: [embed] });
    for (let i = 0; i < options.length; i++) await msg.react(LETTERS[i]);
  },
};
