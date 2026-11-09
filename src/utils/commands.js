const { REST, Routes } = require('discord.js');
const config = require('../config');

// Registers the slash commands in one server (instant, unlike global commands).
async function registerIn(client, guildId) {
  const body = [...client.commands.values()].map((c) => c.data.toJSON());
  const rest = new REST().setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId || client.user.id, guildId), { body });
  return body.length;
}

async function clearIn(client, guildId) {
  const rest = new REST().setToken(config.token);
  await rest.put(Routes.applicationGuildCommands(config.clientId || client.user.id, guildId), { body: [] });
}

module.exports = { registerIn, clearIn };
