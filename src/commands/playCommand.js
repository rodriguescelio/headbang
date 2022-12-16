class PlayCommand {

  constructor(client) {
    this.client = client;
    this.command = 'p';
    this.args = [
        {
          name: 'appendNext',
          alias: 'n',
          type: Boolean
        },
        {
          name: 'text',
          type: 'rest',
          type: String,
        },
      ];
  }

  async exec(event, args) {
    try {
      if (!args._unknown) {
        event.channel.send('Invalid command');
        return;
      }

      let list;

      const unknownArg = args._unknown && args._unknown[0];

      if (unknownArg.indexOf('https://') !== -1) {
        if (this.client.spotifyService.isSpotify(unknownArg)) {
          list = await this.client.spotifyService.getTracks(unknownArg);
        } else if (this.client.youtubeService.isYouTube(unknownArg)) {
          console.log('isYouTube');
          list = await this.client.youtubeService.getTracks(unknownArg);
        } else if (this.client.amazonMusicService.isAmazonMusic(unknownArg)) {
          console.log('isAmazonMusic');
          list = await this.client.amazonMusicService.getTracks(unknownArg);
        }
      } else {
        const search = await this.client.youtubeService.search(unknownArg);
        list = [search];
      }

      list.forEach(it => (it.author = event.author.id));

      this.client.voiceService.enqueue(event, list, args.appendNext);
    } catch (e) {
      console.log(e);
      event.reply(e.message);
    }
  }

}

module.exports = PlayCommand;
