// Non-destructive server sync: brings the server in line with the blueprint
// without deleting anything. Missing roles/categories/channels are created,
// names and order are corrected, panels are updated in place.
const { ChannelType } = require('discord.js');
const store = require('../utils/store');
const settings = require('../utils/settings');
const panels = require('./panels');
const { ROLES, CATEGORIES, overwritesFor } = require('./blueprint');

const LAYOUT = 'layout';

function getLayout(guildId) {
  const l = store.read(LAYOUT)[guildId] || {};
  return { roles: l.roles || {}, categories: l.categories || {}, channels: l.channels || {} };
}
function saveLayout(guildId, layout) {
  const d = store.read(LAYOUT);
  d[guildId] = layout;
  store.write(LAYOUT, d);
}
function clearLayout(guildId) {
  const d = store.read(LAYOUT);
  delete d[guildId];
  store.write(LAYOUT, d);
}

// A guild is "managed" if it was set up before, or already has at least two
// of the blueprint categories (adopts servers built by an older version).
function isManaged(guild) {
  const layout = getLayout(guild.id);
  if (Object.keys(layout.categories).length) return true;
  const names = new Set(CATEGORIES.map((c) => c.name.toLowerCase()));
  const found = guild.channels.cache.filter(
    (c) => c.type === ChannelType.GuildCategory && names.has(c.name.toLowerCase()),
  );
  return found.size >= 2;
}

const sameName = (channel, name, type) =>
  type === ChannelType.GuildText ? channel.name === name.toLowerCase() : channel.name === name;

async function syncServer(guild, { resetPermissions = false } = {}) {
  const report = { created: [], updated: [], panels: [] };
  const layout = getLayout(guild.id);
  const me = guild.members.me;
  const current = settings.getAll(guild.id);
  const newSettings = {};

  // Only fill a setting if it's empty or points to something that no longer exists,
  // so manual changes made with /settings are kept.
  const offer = (key, id, isRole) => {
    const existing = current[key];
    const alive = existing && (isRole ? guild.roles.cache.has(existing) : guild.channels.cache.has(existing));
    if (!alive) newSettings[key] = id;
  };

  // ---- Roles -------------------------------------------------------------
  const roles = {};
  let createdRole = false;
  for (const r of ROLES) {
    let role =
      guild.roles.cache.get(layout.roles[r.key]) ||
      guild.roles.cache.find((x) => x.name === r.name && !x.managed);

    if (!role) {
      role = await guild.roles
        .create({ name: r.name, colors: { primaryColor: r.color }, hoist: r.hoist, permissions: r.permissions, reason: 'Vanta sync' })
        .catch(() => null);
      if (role) {
        report.created.push(`role ${r.name}`);
        createdRole = true;
      }
    } else if (role.editable) {
      const edits = {};
      if (role.name !== r.name) edits.name = r.name;
      if (role.colors?.primaryColor !== r.color) edits.colors = { primaryColor: r.color };
      if (role.hoist !== r.hoist) edits.hoist = r.hoist;
      if (resetPermissions) edits.permissions = r.permissions;
      if (Object.keys(edits).length) {
        await role.edit({ ...edits, reason: 'Vanta sync' }).then(() => report.updated.push(`role ${r.name}`)).catch(() => {});
      }
    }
    if (!role) continue;
    roles[r.key] = role;
    layout.roles[r.key] = role.id;
    if (r.setting) offer(r.setting, role.id, true);
  }

  // Keep blueprint role order (directly below the bot) when something new was created.
  if (createdRole) {
    const top = me.roles.highest.position - 1;
    const positions = ROLES.map((r, i) => roles[r.key] && { role: roles[r.key].id, position: Math.max(1, top - i) }).filter(Boolean);
    await guild.roles.setPositions(positions).catch(() => {});
  }

  // ---- Categories + channels ----------------------------------------------
  let mainChannel = null;
  const panelTargets = [];

  for (const cat of CATEGORIES) {
    const catOverwrites = overwritesFor(cat.access, cat.readonly, guild, roles);
    let parent =
      guild.channels.cache.get(layout.categories[cat.key]) ||
      guild.channels.cache.find((c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === cat.name.toLowerCase());

    if (!parent) {
      parent = await guild.channels
        .create({ name: cat.name, type: ChannelType.GuildCategory, permissionOverwrites: catOverwrites, reason: 'Vanta sync' })
        .catch(() => null);
      if (parent) report.created.push(`category ${cat.name}`);
    } else {
      if (parent.name !== cat.name) {
        parent.setName(cat.name).catch(() => {});
        report.updated.push(`category ${cat.name}`);
      }
      if (resetPermissions) await parent.permissionOverwrites.set(catOverwrites).catch(() => {});
    }
    if (!parent) continue;
    layout.categories[cat.key] = parent.id;
    if (cat.setting) offer(cat.setting, parent.id, false);

    const ordered = [];
    for (const ch of cat.channels) {
      const type = ch.type ?? ChannelType.GuildText;
      const id = `${cat.key}.${ch.key}`;
      const overwrites = overwritesFor(ch.access || cat.access, ch.readonly ?? cat.readonly, guild, roles);
      let channel =
        guild.channels.cache.get(layout.channels[id]) ||
        guild.channels.cache.find((c) => c.type === type && sameName(c, ch.name, type));

      if (!channel) {
        channel = await guild.channels
          .create({ name: ch.name, type, parent: parent.id, permissionOverwrites: overwrites, reason: 'Vanta sync' })
          .catch(() => null);
        if (channel) report.created.push(`channel ${ch.name}`);
      } else {
        if (!sameName(channel, ch.name, type)) {
          channel.setName(ch.name).catch(() => {});
          report.updated.push(`channel ${ch.name}`);
        }
        if (channel.parentId !== parent.id) {
          await channel.setParent(parent.id, { lockPermissions: false }).catch(() => {});
          report.updated.push(`moved ${ch.name}`);
        }
        if (resetPermissions) await channel.permissionOverwrites.set(overwrites).catch(() => {});
      }
      if (!channel) continue;

      layout.channels[id] = channel.id;
      ordered.push(channel);
      for (const key of [].concat(ch.setting || [])) offer(key, channel.id, false);
      if (ch.main) mainChannel = channel;
      if (ch.panel) panelTargets.push({ type: ch.panel, channel });
    }

    // Fix channel order inside the category if it differs from the blueprint.
    const actual = [...ordered].sort((a, b) => a.rawPosition - b.rawPosition).map((c) => c.id);
    if (actual.join() !== ordered.map((c) => c.id).join()) {
      await guild.channels.setPositions(ordered.map((c, i) => ({ channel: c.id, position: i }))).catch(() => {});
    }
  }

  // Fix category order.
  const cats = CATEGORIES.map((c) => guild.channels.cache.get(layout.categories[c.key])).filter(Boolean);
  const actualCats = [...cats].sort((a, b) => a.rawPosition - b.rawPosition).map((c) => c.id);
  if (actualCats.join() !== cats.map((c) => c.id).join()) {
    await guild.channels.setPositions(cats.map((c, i) => ({ channel: c.id, position: i }))).catch(() => {});
    report.updated.push('category order');
  }

  saveLayout(guild.id, layout);
  if (Object.keys(newSettings).length) settings.set(guild.id, newSettings);

  // ---- Panels: update in place, post only if missing ------------------------
  for (const { type, channel } of panelTargets) {
    const result = await panels.ensure(guild, type, channel);
    if (result) report.panels.push(`${type} panel ${result} in ${channel}`);
  }

  return { report, roles, mainChannel };
}

module.exports = { syncServer, isManaged, clearLayout };
