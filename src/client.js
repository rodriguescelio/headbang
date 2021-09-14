const { AkairoClient, CommandHandler, ListenerHandler } = require("discord-akairo");
const { join } = require('path');
const SpotifyService = require("./services/spotifyService");
const VoiceService = require("./services/voiceService");
const YoutubeService = require("./services/youtubeService");

class Client extends AkairoClient {
  constructor() {
    super();

    this.commandHandler = new CommandHandler(this, { directory: join(__dirname, 'commands'), prefix: '-', commandUtil: true });
    this.listenerHandler = new ListenerHandler(this, { directory: join(__dirname, 'listeners') });

    this.spotifyService = new SpotifyService();
    this.youtubeService = new YoutubeService();

    this.voiceService = new VoiceService(this.youtubeService);

    this.commandHandler.useListenerHandler(this.listenerHandler);
    this.commandHandler.loadAll();
    this.listenerHandler.loadAll();
  }
}

module.exports = Client;
