class PrevCommand {

  constructor(client) {
    this.client = client;
    this.command = 'b';
  }

  async exec(event) {
    this.client.voiceService.prevOnQueue(event.channel.guild.id);
  }

}

module.exports = PrevCommand;
