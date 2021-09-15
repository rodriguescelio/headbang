const { Command } = require('discord-akairo');

class NextCommand extends Command {

  constructor() {
    super('nextOnQueue', {
      aliases: ['n', 'next'],
    });
  }

  async exec(event) {
    this.client.voiceService.nextOnQueue(event.channel.guild.id);
  }

}

module.exports = NextCommand;
