const { Events } = require('discord.js');
const verify = require('../handlers/verify');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    await verify.onReactionAdd(reaction, user);
  },
};
