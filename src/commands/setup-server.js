const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const config = require('../config');
const settings = require('../utils/settings');
const panels = require('../server/panels');
const { syncServer, clearLayout } = require('../server/sync');

// Full reset: deletes everything, then builds the layout from src/server/blueprint.js.
// For updates without deleting anything, use /sync-server (also runs on every bot start).
module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-server')
    .setDescription('DANGER: delete all channels + roles and rebuild the server from scratch.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const { guild } = interaction;

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: 'You need Administrator permission to use this.', flags: MessageFlags.Ephemeral });
    }

    const warn = new EmbedBuilder()
      .setColor(config.brand.danger)
      .setTitle('⚠️ Full server reset')
      .setDescription(
        'This will **delete every channel** and **every role I can manage**, then rebuild the server.\n\n' +
          '**This cannot be undone.**\n\n' +
          '💡 Just want to update the layout? Use `/sync-server` instead — it never deletes anything ' +
          'and also runs automatically every time the bot starts.',
      );
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('setup_confirm').setLabel('Yes, reset everything').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('setup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const response = await interaction.reply({
      embeds: [warn],
      components: [buttons],
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });

    let choice;
    try {
      choice = await response.resource.message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: 30_000,
      });
    } catch {
      return interaction.editReply({ content: 'Timed out — no changes made.', embeds: [], components: [] });
    }
    if (choice.customId === 'setup_cancel') {
      return choice.update({ content: 'Cancelled — no changes made.', embeds: [], components: [] });
    }
    await choice.update({ content: '🔧 Resetting the server… this can take a minute.', embeds: [], components: [] });

    const me = guild.members.me;
    const log = [];

    // 1) Delete channels
    let deletedChannels = 0;
    for (const channel of [...guild.channels.cache.values()]) {
      if (!channel.deletable) continue;
      await channel.delete('Server reset via /setup-server').then(() => deletedChannels++).catch(() => {});
    }
    log.push(`🗑️ Deleted **${deletedChannels}** channel(s)`);

    // 2) Delete roles (skip @everyone, managed/bot roles, roles at/above the bot)
    let deletedRoles = 0;
    for (const role of [...guild.roles.cache.values()]) {
      if (role.id === guild.id || role.managed || role.position >= me.roles.highest.position) continue;
      await role.delete('Server reset via /setup-server').then(() => deletedRoles++).catch(() => {});
    }
    log.push(`🗑️ Deleted **${deletedRoles}** role(s)`);

    // 3) Forget the old layout and build fresh from the blueprint
    clearLayout(guild.id);
    panels.clearGuild(guild.id);
    settings.set(guild.id, { autoRoleId: '' }); // Member role comes from accepting the rules
    const { report, roles, mainChannel } = await syncServer(guild, { resetPermissions: true });
    log.push(`✨ Created **${report.created.length}** roles/categories/channels`);
    if (report.panels.length) log.push(`📌 ${report.panels.join('\n📌 ')}`);
    log.push('⚙️ Settings saved (welcome, logs, tickets, verified role)');

    // 4) Give the admin who ran this the Admin role
    if (roles.admin) await interaction.member.roles.add(roles.admin, 'Server setup').catch(() => {});

    const summary = new EmbedBuilder()
      .setColor(config.brand.success)
      .setTitle('✅ Server setup complete')
      .setDescription(log.join('\n'))
      .setFooter({ text: 'From now on the bot keeps the layout up to date automatically.' })
      .setTimestamp();
    await interaction.editReply({ content: '', embeds: [summary], components: [] }).catch(() => {});

    if (mainChannel) {
      mainChannel
        .send({
          embeds: [
            new EmbedBuilder()
              .setColor(config.brand.color)
              .setTitle(`Welcome to ${guild.name}!`)
              .setDescription('The server has been set up. Have fun! 🎉\nType `/help` to see what I can do.'),
          ],
        })
        .catch(() => {});
    }

    // 5) Existing members keep access: give them the Member role (in the background)
    if (roles.member) {
      const members = await guild.members.fetch().catch(() => null);
      for (const m of members?.values() ?? []) {
        if (!m.user.bot) await m.roles.add(roles.member, 'Server setup').catch(() => {});
      }
    }
  },
};
