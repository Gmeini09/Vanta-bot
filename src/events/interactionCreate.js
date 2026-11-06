const { Events } = require('discord.js');
const config = require('../config');
const roles = require('../handlers/roles');
const tickets = require('../handlers/tickets');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      // Slash commands
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        return command.execute(interaction, client);
      }

      // Buttons
      if (interaction.isButton()) {
        const id = interaction.customId;

        // Role toggle buttons
        if (config.roleButtons[id]) {
          return roles.toggleRole(interaction, config.roleButtons[id]);
        }

        // Ticket buttons
        if (id === 'ticket_open') return tickets.openTicket(interaction);
        if (id === 'ticket_close') return tickets.closeTicket(interaction);
      }
    } catch (err) {
      console.error('[interaction] error:', err);
      const reply = { content: 'Something went wrong handling that.', ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        interaction.followUp(reply).catch(() => {});
      } else {
        interaction.reply(reply).catch(() => {});
      }
    }
  },
};
