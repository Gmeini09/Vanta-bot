const { Events } = require('discord.js');
const tickets = require('../tickets/manager');

// Clean up ticket data when a ticket channel is deleted by hand.
module.exports = {
  name: Events.ChannelDelete,
  execute(channel) {
    tickets.deleteMeta(channel.id);
  },
};
