import { Logger, getLogger } from 'log4js';
import Music from '../types/music';
import MusicProvider from '../types/musicProvider';
import Playlist from '../types/playlist';
import { singleton } from 'tsyringe';
import ytpl from 'ytpl';
import ytdl, { getBasicInfo, validateURL } from 'ytdl-core';
import axios from 'axios';
import DateTime from '../utils/dateTime';
import { YouTubeStream, stream as playDlStream } from 'play-dl';
import TracksResult from '../types/tracksResult';
import { stream as ytStream } from 'yt-stream';

const YOUTUBE_URL = 'https://www.youtube.com';
const WATCH_URL = `${YOUTUBE_URL}/watch?v=`;
const PLAYLIST_URL = `${YOUTUBE_URL}/playlist?list=`;
const SEARCH_URL = `${YOUTUBE_URL}/results?sp=EgIQAQ%253D%253D&search_query=`;

@singleton()
export default class YoutubeProvider {
  LOG: Logger;

  constructor() {
    this.LOG = getLogger('YoutubeService');
  }

  isUrlValid(url: string) {
    return url.indexOf('youtube.com') !== -1 || url.indexOf('youtu.be') !== -1;
  }

  private getPlaylistUrl(query: URLSearchParams) {
    return PLAYLIST_URL + query.get('list');
  }

  private getVideoUrl(query: URLSearchParams) {
    return WATCH_URL + query.get('v');
  }

  private normalizeUrl(url: string) {
    const query = new URLSearchParams(url.substring(url.indexOf('?') + 1));
    const isPlaylist = query.has('list');

    return {
      isPlaylist,
      url: isPlaylist ? this.getPlaylistUrl(query) : this.getVideoUrl(query),
    };
  }

  private getBestThumbnail(thumbnails: any[]): string {
    thumbnails.sort((a, b) => b.width - a.width);
    return thumbnails[0].url;
  }

  private formatError(e: any): Error {
    return new Error(e.message.replace('API-Error: ', ''));
  }

  private async fetchPlaylist(url: string): Promise<Playlist> {
    try {
      const data = await ytpl(url, { limit: 400 });

      if (data && data.items && data.items.length) {
        const result: Playlist = {
          title: data.title,
          description: data.description,
          url: data.url,
          author: {
            name: data.author.name,
            url: data.author.url,
          },
          items: data.items.map((it) => {
            const item: Music = {
              provider: MusicProvider.YOUTUBE,
              title: it.title,
              url: it.shortUrl,
              duration: it.durationSec || 0,
              author: {
                name: it.author.name,
                url: it.author.url,
              },
            };

            if (it.bestThumbnail && it.bestThumbnail.url) {
              item.thumb = it.bestThumbnail.url;
            }

            return item;
          }),
        };

        if (data.bestThumbnail && data.bestThumbnail.url) {
          result.thumb = data.bestThumbnail.url;
        }

        if (data.author.bestAvatar && data.author.bestAvatar.url) {
          result.author.avatar = data.author.bestAvatar.url;
        }

        return result;
      }

      throw new Error('A busca pela playlist retornou vazia');
    } catch (e: any) {
      this.LOG.error('Erro ao buscar playlist', e);
      throw this.formatError(e);
    }
  }

  private async fetchMusic(url: string): Promise<Music> {
    try {
      const data = await getBasicInfo(url);
      const result: Music = {
        provider: MusicProvider.YOUTUBE,
        title: data.videoDetails.title,
        url: data.videoDetails.video_url,
        duration: parseInt(data.videoDetails.lengthSeconds, 10),
        author: {
          name: data.videoDetails.author.name,
          url: data.videoDetails.author.user_url || '',
        },
      };

      if (data.videoDetails.thumbnails && data.videoDetails.thumbnails.length) {
        result.thumb = this.getBestThumbnail(data.videoDetails.thumbnails);
      }

      return result;
    } catch (e) {
      this.LOG.error('Erro ao buscar video', e);
      throw this.formatError(e);
    }
  }

  async getTracks(url: string): Promise<TracksResult> {
    if (!this.isUrlValid(url)) {
      throw new Error('A url informada não é uma url do youtube');
    }

    const urlData = this.normalizeUrl(url);
    return {
      isPlaylist: urlData.isPlaylist,
      result: urlData.isPlaylist
        ? await this.fetchPlaylist(urlData.url)
        : await this.fetchMusic(urlData.url),
    };
  }

  async search(text: string): Promise<Music> {
    const url = SEARCH_URL + encodeURIComponent(text);
    const data = await axios.get(url).then((r) => r.data);

    const script = data.match(
      new RegExp('var ytInitialData = (.*?)</script>', 'g'),
    );

    if (script.length) {
      const rawJson = script[0].substr(20, script[0].length - 30);
      const json = JSON.parse(rawJson);

      try {
        const { videoRenderer } =
          json.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents
            .find((it: any) => !!it.itemSectionRenderer)
            .itemSectionRenderer.contents.filter(
              (it: any) => !!it.videoRenderer,
            )[0];

        const author = videoRenderer.ownerText.runs[0];

        const result: Music = {
          provider: MusicProvider.YOUTUBE,
          title: videoRenderer.title.runs[0].text,
          url: WATCH_URL + videoRenderer.videoId,
          duration: DateTime.toSeconds(videoRenderer.lengthText.simpleText),
          author: {
            name: author.text,
            url:
              YOUTUBE_URL +
              author.navigationEndpoint.browseEndpoint.canonicalBaseUrl,
          },
        };

        if (
          videoRenderer.thumbnail &&
          videoRenderer.thumbnail.thumbnails &&
          videoRenderer.thumbnail.thumbnails.length
        ) {
          videoRenderer.thumbnail.thumbnails.sort(
            (a: any, b: any) => b.width - a.width,
          );
          result.thumb = videoRenderer.thumbnail.thumbnails[0].url;
        }

        return result;
      } catch (e) {
        this.LOG.error('Erro ao buscar video por palavra', e);
      }
    }

    throw new Error(`Não foi encontrado nenhum vídeo com o texto: ${text}`);
  }

  private getStream(url: string, fn: () => any): any {
    if (validateURL(url)) {
      try {
        return fn();
      } catch (e) {}
    }
    throw new Error(`Não foi possível encontrar o stream da url: ${url}`);
  }

  getStreamPlayDl(url: string): Promise<YouTubeStream> {
    return this.getStream(url, () =>
      playDlStream(url),
    ) as Promise<YouTubeStream>;
  }

  getStreamYtDl(url: string): any {
    return this.getStream(url, () => ytdl(url, { filter: 'audioonly' }));
  }

  getStreamYtStream(url: string): any {
    return this.getStream(url, () =>
      ytStream(url, {
        quality: 'high',
        type: 'audio',
        highWaterMark: 1048576 * 32,
        download: true,
      }),
    );
  }
}
