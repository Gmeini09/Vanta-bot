const { MessageFlags } = require("discord.js");
module.exports = {
  async toggleRole(interaction, roleId) {
    const member = interaction.member;
    const role = interaction.guild.roles.cache.get(roleId);

    if (!role) {
      return interaction.reply({
        content: 'That role no longer exists. Ask an admin to update the panel.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const me = interaction.guild.members.me;
    if (role.position >= me.roles.highest.position) {
      return interaction.reply({
        content: "I can't assign that role — my role must be above it.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (member.roles.cache.has(roleId)) {
      await member.roles.remove(roleId);
      return interaction.reply({ content: `Removed **${role.name}**.`, flags: MessageFlags.Ephemeral });
    }

    await member.roles.add(roleId);
    return interaction.reply({ content: `Added **${role.name}**.`, flags: MessageFlags.Ephemeral });
  },
};
