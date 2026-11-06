const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const config = require('../config');
const settings = require('../utils/settings');

const EPH = MessageFlags.Ephemeral;

const CHANNEL_KEYS = {
  welcomeChannelId: 'Welcome channel',
  leaveChannelId: 'Leave channel',
  modLogChannelId: 'Mod-log channel',
  ticketLogChannelId: 'Ticket log channel',
  ticketCategoryId: 'Ticket category',
};
const ROLE_KEYS = {
  autoRoleId: 'Auto-role (new members)',
  ticketSupportRoleId: 'Ticket support role',
};
const ALL_KEYS = { ...CHANNEL_KEYS, ...ROLE_KEYS };
const choices = (obj) => Object.entries(obj).map(([value, name]) => ({ name, value }));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('View and change Vanta\'s settings for this server.')
    .addSubcommand((s) => s.setName('view').setDescription('Show the current settings.'))
    .addSubcommand((s) =>
      s
        .setName('channel')
        .setDescription('Set a channel setting.')
        .addStringOption((o) => o.setName('setting').setDescription('Which setting').setRequired(true).addChoices(...choices(CHANNEL_KEYS)))
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('Channel (or category for "Ticket category")')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildCategory),
        ),
    )
    .addSubcommand((s) =>
      s
        .setName('role')
        .setDescription('Set a role setting.')
        .addStringOption((o) => o.setName('setting').setDescription('Which setting').setRequired(true).addChoices(...choices(ROLE_KEYS)))
        .addRoleOption((o) => o.setName('role').setDescription('Role').setRequired(true)),
    )
    .addSubcommand((s) =>
      s
        .setName('reset')
        .setDescription('Reset a setting (falls back to the default).')
        .addStringOption((o) => o.setName('setting').setDescription('Which setting').setRequired(true).addChoices(...choices(ALL_KEYS))),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'channel') {
      const key = interaction.options.getString('setting');
      const channel = interaction.options.getChannel('channel');
      const wantsCategory = key === 'ticketCategoryId';
      if (wantsCategory !== (channel.type === ChannelType.GuildCategory)) {
        return interaction.reply({
          content: wantsCategory ? 'Please pick a **category**.' : 'Please pick a **text channel**.',
          flags: EPH,
        });
      }
      settings.set(guildId, { [key]: channel.id });
      return interaction.reply({ content: `✅ **${CHANNEL_KEYS[key]}** set to ${channel}.`, flags: EPH });
    }

    if (sub === 'role') {
      const key = interaction.options.getString('setting');
      const role = interaction.options.getRole('role');
      if (role.managed || role.id === guildId) {
        return interaction.reply({ content: 'Pick a normal role (not @everyone or a bot role).', flags: EPH });
      }
      settings.set(guildId, { [key]: role.id });
      return interaction.reply({ content: `✅ **${ROLE_KEYS[key]}** set to ${role}.`, flags: EPH });
    }

    if (sub === 'reset') {
      const key = interaction.options.getString('setting');
      settings.reset(guildId, key);
      return interaction.reply({ content: `↩️ **${ALL_KEYS[key]}** reset.`, flags: EPH });
    }

    // view
    const s = settings.getAll(guildId);
    const fmt = (key) => {
      const id = s[key];
      if (!id) return '`not set`';
      return ROLE_KEYS[key] ? `<@&${id}>` : `<#${id}>`;
    };
    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`⚙️ ${config.brand.name} settings`)
      .setDescription(Object.entries(ALL_KEYS).map(([k, label]) => `**${label}:** ${fmt(k)}`).join('\n'))
      .setFooter({ text: 'Change with /settings channel, /settings role or /settings reset' });
    return interaction.reply({ embeds: [embed], flags: EPH });
  },
};
