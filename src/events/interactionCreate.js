const { Events, MessageFlags } = require('discord.js');
const config = require('../config');
const roles = require('../handlers/roles');
const rules = require('../handlers/rules');
const tickets = require('../tickets/manager');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      // Slash commands
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction, client);
        return;
      }

      // Ticket category dropdown
      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_select') await tickets.onSelect(interaction);
        else if (interaction.customId.startsWith('ticket_buy_')) await tickets.onShopSelect(interaction);
        return;
      }

      // Ticket form submitted
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('ticket_modal:')) await tickets.onModal(interaction);
        return;
      }

      // Buttons
      if (interaction.isButton()) {
        const id = interaction.customId;
        if (config.roleButtons[id]) {
          await roles.toggleRole(interaction, config.roleButtons[id]);
          return;
        }
        if (id === 'rules_accept') {
          await rules.onAccept(interaction);
          return;
        }
        if (id.startsWith('ticket_')) {
          await tickets.onButton(interaction);
        }
        // Other buttons (e.g. /setup-server confirmation) are handled by collectors.
      }
    } catch (err) {
      const where = interaction.commandName || interaction.customId || 'interaction';
      console.error(`[interaction] error in ${where}:`, err);
      const reply = { content: '❌ Something went wrong. Please try again.', flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) {
        interaction.followUp(reply).catch(() => {});
      } else if (interaction.isRepliable()) {
        interaction.reply(reply).catch(() => {});
      }
    }
  },
};
