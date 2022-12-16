class NextCommand {

  constructor(client) {
    this.client = client;
    this.command = 'n';
  }

  async exec(event) {
    this.client.voiceService.nextOnQueue(event.channel.guild.id);
  }

}

module.exports = NextCommand;
