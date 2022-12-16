const fetch = require('isomorphic-unfetch')
const { getData, getPreview, getTracks, getDetails } = require('spotify-url-info')(fetch)

class SpotifyService {
  isSpotify(url) {
    return url.indexOf('open.spotify.com') !== -1;
  }

  async getTracks(url) {
    if (!this.isSpotify(url)) {
      throw new Error('Invalid url');
    }

    try {
      const data = await getData(url);
      const tracks = [];

      switch (data.type) {
        case 'playlist':
          tracks.push(
            ...data.trackList.map(it => ({
              from: 'spotify',
              title: `${it.title} - ${it.subtitle}`,
              duration: Math.round(it.duration / 1000),
            }))
          );
          break;
        case 'artist':
          tracks.push(
            ...data.tracks.map(it => ({
              from: 'spotify',
              title: `${it.name} - ${data.name}`,
              duration: Math.round(it.duration_ms / 1000),
            }))
          );
          break;
        case 'track':
          tracks.push({
            from: 'spotify',
            title: `${data.name} - ${data.artists[0].name}`,
            duration: Math.round(data.duration_ms / 1000),
          });
          break;
        default:
          throw new Error('');
      }

      return tracks;
    } catch (e) {
      console.log(e);
      throw new Error(`Could not load Spotify data with this url: ${url} - ${e.message}`);
    }
  }
}

module.exports = SpotifyService;
