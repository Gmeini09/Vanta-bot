const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleall')
    .setDescription('Give a role to (or remove it from) every member.')
    .addRoleOption((o) => o.setName('role').setDescription('The role').setRequired(true))
    .addStringOption((o) =>
      o
        .setName('action')
        .setDescription('Add or remove (default: add)')
        .addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }),
    )
    .addBooleanOption((o) => o.setName('bots').setDescription('Include bots (default: no)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const remove = interaction.options.getString('action') === 'remove';
    const bots = interaction.options.getBoolean('bots') ?? false;
    const { guild, member } = interaction;

    if (role.id === guild.id || role.managed) {
      return interaction.reply({ content: '❌ That role can\'t be assigned.', flags: MessageFlags.Ephemeral });
    }
    if (!role.editable) {
      return interaction.reply({
        content: `❌ ${role} is above my highest role — move my role above it first.`,
        flags: MessageFlags.Ephemeral,
      });
    }
    if (guild.ownerId !== member.id && role.position >= member.roles.highest.position) {
      return interaction.reply({ content: `❌ ${role} is not below your highest role.`, flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const all = await guild.members.fetch();
    const targets = all.filter((m) => (bots || !m.user.bot) && m.roles.cache.has(role.id) === remove);
    if (!targets.size) return interaction.editReply(`Nothing to do — everyone already ${remove ? 'lacks' : 'has'} ${role}.`);

    await interaction.editReply(`⏳ ${remove ? 'Removing' : 'Adding'} ${role} for **${targets.size}** member(s)…`);
    let ok = 0;
    let failed = 0;
    let i = 0;
    for (const m of targets.values()) {
      const done = remove ? m.roles.remove(role, `/roleall by ${interaction.user.tag}`) : m.roles.add(role, `/roleall by ${interaction.user.tag}`);
      await done.then(() => ok++).catch(() => failed++);
      if (++i % 25 === 0) await interaction.editReply(`⏳ ${i}/${targets.size} done…`).catch(() => {});
    }
    return interaction
      .editReply(`✅ ${remove ? 'Removed' : 'Added'} ${role} ${remove ? 'from' : 'to'} **${ok}** member(s)${failed ? ` (${failed} failed)` : ''}.`)
      .catch(() => {});
  },
};
