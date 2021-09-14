const youtubeSearcher = require('ytsr');
const youtubePlaylist = require('ytpl');
const youtube = require('ytdl-core');
const DateTimeUtil = require('../utils/dateTimeUtil');

class YoutubeService {
  isYouTube(url) {
    return url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1;
  }

  isYouTubePlaylist(url) {
    return this.isYouTube(url) && url.indexOf('playlist?list=') !== -1;
  }

  async getTracks(url) {
    try {
      if (this.isYouTube(url)) {
        if (this.isYouTubePlaylist(url)) {
          const data = await youtubePlaylist(url, { limit: Infinity });
          if (data && data.items && data.items.length) {
            return data.items.map(it => ({ type: 'youtube', title: it.title, url: it.shortUrl, duration: it.durationSec }));
          }
          throw new Error(`Could not find any playlist from the url: ${url}`);
        } else {
          const data = await youtube.getBasicInfo(url);
          return [
            {
              type: 'youtube',
              title: data.videoDetails.title,
              url: data.videoDetails.video_url,
              duration: parseInt(data.videoDetails.lengthSeconds, 10)
            }
          ];
        }
      }
    } catch (e) {
      throw new Error(e.message.replace('API-Error: ', ''));
    }
  }

  async search(title) {
    const data = await youtubeSearcher(title);

    if (data && data.items && data.items.length) {
      return {
        from: 'youtube',
        title: data.items[0].title,
        url: data.items[0].url,
        duration: DateTimeUtil.getDurationInSeconds(data.items[0].duration),
      };
    }

    throw new Error(`Could not find any video with the title: ${title}`);
  }

  async getStream(url) {
    if (youtube.validateURL(url)) {
      return youtube(url, { filter: 'audioonly' });
    } else {
      throw new Error(`Could not find any video with the url: ${url}`);
    }
  }
}

module.exports = YoutubeService;
