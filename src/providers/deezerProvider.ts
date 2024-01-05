import { Logger, getLogger } from "log4js";
import { DeezerAlbum, DeezerPlaylist, DeezerTrack, deezer } from "play-dl";
import Music from "../types/music";
import { singleton } from "tsyringe";
import MusicProvider from "../types/musicProvider";
import TracksResult from "../types/tracksResult";
import Playlist from "../types/playlist";

@singleton()
export default class DeezerProvider {

  LOG: Logger;

  constructor() {
    this.LOG = getLogger('DeezerService');
  }

  isUrlValid(url: string): boolean {
    return url.indexOf('deezer.com') !== -1 || url.indexOf('deezer.page.link') !== -1;
  }

  private getMusic(track: DeezerTrack): Music {
    const result: Music = {
      provider: MusicProvider.DEEZER,
      title: track.title,
      url: track.url,
      duration: track.durationInSec,
      author: {
        name: track.artist.name,
        url: track.artist.url,
      },
    };

    if (track.album && track.album.cover) {
      result.thumb = track.album.cover.xl;
    }

    return result;
  }

  async getTracks(url: string): Promise<TracksResult> {
    if (!this.isUrlValid(url)) {
      throw new Error('A url informada não é uma url do deezer');
    }

    try {
      const raw = await deezer(url);

      if (raw.type === 'track') {
        const data = raw as DeezerTrack;
        return {
          isPlaylist: false,
          result: this.getMusic(data),
        };
      } else {
        const data = raw as DeezerPlaylist;

        const result: Playlist = {
          title: data.title,
          description: data.description || null,
          url: data.url,
          author: {
            name: data.creator?.name || '',
            url: null,
          },
          items: data.tracks.map(this.getMusic)
        };

        if (data.picture) {
          result.thumb = data.picture.xl;
        }

        if (data.type === 'album') {
          const album = data as unknown as DeezerAlbum;
          result.author.name = album.artist.name;
          result.author.url = album.artist.url;
          if (album.artist.picture) {
            result.author.avatar = album.artist.picture.xl;
          }
        }

        return { isPlaylist: true, result };
      }
    } catch (e) {
      this.LOG.error("Erro ao buscar dados no deezer", e);
      throw new Error(`Ocorreu um erro ao buscar as informações da url: ${url}`);
    }
  }

}
