const { Command } = require('discord-akairo');

class ControlCommand extends Command {

  constructor() {
    super('control', {
      aliases: ['n', 'next', 'b', 'back', 'prev', 'clear'],
    });
  }

  async exec(event) {
    const guildId = event.channel.guild.id;
    if (['n', 'next'].indexOf(event.util.parsed.alias) !== -1) {
      this.client.voiceService.nextOnQueue(guildId);
    } else if (['b', 'back', 'prev'].indexOf(event.util.parsed.alias) !== -1) {
      this.client.voiceService.prevOnQueue(guildId);
    } else if (event.util.parsed.alias === 'clear') {
      this.client.voiceService.quit(guildId, true);
    }
  }

}

module.exports = ControlCommand;
