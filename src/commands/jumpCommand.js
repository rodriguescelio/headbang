const { Command } = require('discord-akairo');

class JumpCommand extends Command {

  constructor() {
    super('jumpQueueTo', {
      aliases: ['j', 'jump'],
      args: [
        {
          id: 'index',
          type: 'number'
        },
      ]
    });
  }

  async exec(event, args) {
    if (args.index) {
      this.client.voiceService.jumpQueueTo(event.channel.guild.id, args.index);
    }
  }

}

module.exports = JumpCommand;
