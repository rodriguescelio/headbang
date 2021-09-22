const { isAmazonMusic, getData } = require('amazon-music-info');

class AmazonMusicService {
  isAmazonMusic(url) {
    return isAmazonMusic(url);
  }

  async getTracks(url) {
    if (!isAmazonMusic(url)) {
      throw new Error('Invalid url');
    }

    try {
      const data = await getData(url);
      return data.items.map(it => ({
        from: 'amazon_music',
        title: `${it.name} - ${it.artist}`,
        duration: it.duration || 0,
      }));
    } catch (e) {
      throw new Error(`Could not load AmazonMusic data with this url: ${url} - ${e.message}`);
    }
  }
}

module.exports = AmazonMusicService;
