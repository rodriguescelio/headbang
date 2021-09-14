const { Command } = require('discord-akairo');

class PingCommand extends Command {
  constructor() {
    super('ping', {
      aliases: ['ping'] 
    });
  }

  exec(message) {
    message.channel.send('Pong!');
  }
}

module.exports = PingCommand;
