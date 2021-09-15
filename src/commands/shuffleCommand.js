const { Command } = require('discord-akairo');

class ShuffleCommand extends Command {

  constructor() {
    super('shuffleQueue', {
      aliases: ['shuffle']
    });
  }

  async exec(event) {
    if (this.client.voiceService.shuffleQueue(event.channel.guild.id)) {
      event.react('✅');
    } else {
      event.reply('Empty queue! Nothing to shuffle.');
    }
  }

}

module.exports = ShuffleCommand;
