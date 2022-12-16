class ShuffleCommand {

  constructor(client) {
    this.client = client;
    this.command = 'shuffle';
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
