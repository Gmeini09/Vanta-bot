const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const config = require('../config');
const warnings = require('../utils/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View or clear a member\'s warnings.')
    .addSubcommand((s) =>
      s
        .setName('list')
        .setDescription('List a member\'s warnings.')
        .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('clear')
        .setDescription('Clear all warnings of a member.')
        .addUserOption((o) => o.setName('member').setDescription('Member').setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('member');

    if (sub === 'clear') {
      warnings.clear(interaction.guild.id, user.id);
      return interaction.reply({ content: `Cleared all warnings for **${user.tag}**.`, ephemeral: true });
    }

    const list = warnings.get(interaction.guild.id, user.id);
    if (list.length === 0) {
      return interaction.reply({ content: `**${user.tag}** has no warnings.`, ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(config.brand.warn)
      .setTitle(`Warnings for ${user.tag}`)
      .setDescription(
        list
          .slice(-15)
          .map(
            (w, i) =>
              `**${i + 1}.** ${w.reason}\n<@${w.mod}> · <t:${Math.floor(w.at / 1000)}:R>`,
          )
          .join('\n\n'),
      )
      .setFooter({ text: `Total: ${list.length}` });

    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
