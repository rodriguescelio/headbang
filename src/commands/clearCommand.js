class ClearCommand {

  constructor(client) {
    this.client = client;
    this.command = 'c';
  }

  async exec(event) {
    this.client.voiceService.quit(event.channel.guild.id, true);
  }

}

module.exports = ClearCommand;
