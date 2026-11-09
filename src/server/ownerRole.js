// Makes sure every server has an "Owner" role with all permissions, placed as
// high as the bot can put it, and gives it to the server owner.
const { PermissionFlagsBits: P } = require('discord.js');

const NAME = '👑 Owner';

async function ensureOwnerRole(guild) {
  const me = guild.members.me;
  if (!me?.permissions.has(P.ManageRoles)) return console.warn(`[owner] ${guild.name}: missing Manage Roles.`);

  let role = guild.roles.cache.find((r) => r.name === NAME || r.name === 'Owner');
  if (!role) {
    role = await guild.roles
      .create({ name: NAME, color: 0xF1C40F, hoist: true, permissions: [P.Administrator], reason: 'Owner role' })
      .catch((err) => console.error(`[owner] ${guild.name}: could not create role:`, err.message));
    if (!role) return;
    console.log(`[owner] ${guild.name}: created ${NAME}.`);
  } else if (!role.permissions.has(P.Administrator) && role.editable) {
    await role.setPermissions([P.Administrator], 'Owner role').catch(() => {});
  }

  // Directly below the bot's own role (the highest spot the bot may use).
  const top = me.roles.highest.position - 1;
  if (role.editable && role.position < top) await role.setPosition(top, { reason: 'Owner role' }).catch(() => {});

  const owner = await guild.fetchOwner().catch(() => null);
  if (owner && !owner.roles.cache.has(role.id)) {
    await owner.roles.add(role, 'Server owner').catch(() => {});
    console.log(`[owner] ${guild.name}: gave ${NAME} to ${owner.user.tag}.`);
  }
}

module.exports = { ensureOwnerRole };
