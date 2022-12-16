class PingCommand {
  constructor(client) {
    this.client = client;
    this.command = 'ping';
  }

  exec(message) {
    message.channel.send('Pong!');
  }
}

module.exports = PingCommand;
