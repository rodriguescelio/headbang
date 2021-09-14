const { Command } = require('discord-akairo');

class PlayCommand extends Command {

  constructor() {
    super('play', {
      aliases: ['p', 'play'],
      separator: ' ',
      args: [
        {
          id: 'appendNext',
          match: 'flag',
          flag: ['-n', '-next']
        },
        {
          id: 'text',
          type: 'rest',
        },
      ]
    });
  }

  async exec(event, args) {
    try {
      if (!args.text) {
        event.channel.send('Invalid command');
        return;
      }

      let list;

      if (args.text.indexOf('https://') !== -1) {
        if (this.client.spotifyService.isSpotify(args.text)) {
          list = await this.client.spotifyService.getTracks(args.text);
        } else if (this.client.youtubeService.isYouTube(args.text)) {
          list = await this.client.youtubeService.getTracks(args.text);
        } else if (this.client.amazonMusicService.isAmazonMusic(args.text)) {
          list = await this.client.amazonMusicService.getTracks(args.text);
        }
      } else {
        const search = await this.client.youtubeService.search(args.text);
        list = [search];
      }

      this.client.voiceService.enqueue(event, list, args.appendNext);
    } catch (e) {
      event.reply(e.message);
    }
  }

}

module.exports = PlayCommand;
