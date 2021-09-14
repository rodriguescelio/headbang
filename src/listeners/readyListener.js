const { Listener } = require('discord-akairo');

class ReadyListener extends Listener {
  constructor() {
    super('ready', { emitter: 'client', event: 'ready' });
  }
  exec() {
    console.log('ready!');
  }
}

module.exports = ReadyListener;
