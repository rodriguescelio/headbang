const { Command } = require('discord-akairo');

class ClearCommand extends Command {

  constructor() {
    super('clearQueue', {
      aliases: ['c', 'clear'],
    });
  }

  async exec(event) {
    this.client.voiceService.quit(event.channel.guild.id, true);
  }

}

module.exports = ClearCommand;
