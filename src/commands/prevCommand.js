const { Command } = require('discord-akairo');

class PrevCommand extends Command {

  constructor() {
    super('prevOnQueue', {
      aliases: ['b', 'back', 'prev']
    });
  }

  async exec(event) {
    this.client.voiceService.prevOnQueue(event.channel.guild.id);
  }

}

module.exports = PrevCommand;
