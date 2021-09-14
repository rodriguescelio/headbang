const axios = require('axios');
const DateTimeUtil = require('../utils/dateTimeUtil');

const DEFAULT_HEADERS = {
  headers: {
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36',
    'x-amzn-application-version': '1.0.7980.0',
    'x-amzn-authentication': '{"interface":"ClientAuthenticationInterface.v1_0.ClientTokenElement","accessToken":""}',
    'x-amzn-device-family': 'WebPlayer',
    'x-amzn-device-height': '1080',
    'x-amzn-device-id': '13436091444745537',
    'x-amzn-device-language': 'pt_BR',
    'x-amzn-device-model': 'WEBPLAYER',
    'x-amzn-device-width': '1920',
    'x-amzn-music-domain': 'music.amazon.com.br',
    'x-amzn-os-version': '1.0',
    'x-amzn-page-url': 'https://music.amazon.com.br',
    'x-amzn-session-id': '133-3289044-2947901',
    'x-amzn-timestamp': '1631644168280',
  }
};

const URL = 'https://na.mesk.skill.music.a2z.com/api/showHome?deeplink=%7B%22interface%22%3A%22DeeplinkInterface.v1_0.DeeplinkClientInformation%22%2C%22deeplink%22%3A%22%2Fplaylists%2F{PLAYLIST_CODE}%22%7D';

class AmazonMusicService {
  isAmazonMusic(url) {
    return url.indexOf('music.amazon.com') !== -1;
  }

  isAmazonMusicPlaylist(url) {
    return this.isAmazonMusic(url) && url.indexOf('/playlists/') !== -1;
  }

  async getTracks(url) {
    if (!this.isAmazonMusic(url)) {
      throw new Error('Invalid url');
    }

    try {
      const tracks = [];

      if (this.isAmazonMusicPlaylist(url)) {
        const code = url.match(/\/playlists\/(\w+)\?/i);
        const apiUrl = URL.replace('{PLAYLIST_CODE}', code[1]);

        const data = await axios.get(apiUrl, DEFAULT_HEADERS).then(res => res.data);

        const method = data.methods.find(it => it.interface === 'TemplateListInterface.v1_0.CreateAndBindTemplateMethod');

        if (method && method.template && method.template.widgets) {
          if (method.template.widgets.length && method.template.widgets[0].items && method.template.widgets[0].items.length) {
            tracks.push(
              ...method.template.widgets[0].items.map(
                it => ({
                  from: 'amazon_music',
                  title: `${it.primaryText} - ${it.secondaryText1}`,
                  duration: DateTimeUtil.getDurationInSeconds(it.secondaryText3)
                })
              )
            );
          }
        }
      }

      return tracks;
    } catch (e) {
      throw new Error(`Could not load AmazonMusic data with this url: ${url} - ${e.message}`);
    }
  }
}

module.exports = AmazonMusicService;
