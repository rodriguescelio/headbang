class JumpCommand {

  constructor(client) {
    this.client = client;
    this.command = 'j';
    this.args = [
      { name: 'index', type: Number, defaultOption: true },
    ];
  }

  async exec(event, args) {
    console.log(args);    
    if (args.index) {
      this.client.voiceService.jumpQueueTo(event.channel.guild.id, args.index);
    }
  }

}

module.exports = JumpCommand;
