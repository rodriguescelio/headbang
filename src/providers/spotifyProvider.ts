import { Logger, getLogger } from "log4js";
import { singleton } from "tsyringe";
import { parse } from "spotify-uri";
import axios from "axios";
import Playlist from "../types/playlist";
import Music from "../types/music";
import MusicProvider from "../types/musicProvider";
import TracksResult from "../types/tracksResult";

const ACCESS_TOKEN_URL = 'https://accounts.spotify.com/api/token?grant_type=client_credentials';
const API_URL = 'https://api.spotify.com/v1';

@singleton()
export default class SpotifyProvider {

  LOG: Logger;
  accessToken?: {
    access_token: string;
    token_type: string;
    expires_in: number;
    expires_after: number;
  };

  constructor() {
    this.LOG = getLogger('SpotifyService');
  }

  isUrlValid(url: string): boolean {
    try {
      if (url.indexOf('spotify.com') === -1) {
        return false;
      }

      parse(url);

      return true;
    } catch (e) {
      return false;
    }
  }

  private getBasicToken() {
    const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
    return Buffer
      .from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)
      .toString('base64');
  }

  private async requestToken() {
    try {
      const data = await axios({
        method: 'post',
        url: ACCESS_TOKEN_URL,
        headers: {
          Authorization: `Basic ${this.getBasicToken()}`,
        }
      }).then(r => r.data);

      if (data.access_token) {
        this.accessToken = {
          ...data,
          expires_after: Date.now() + data.expires_in,
        };
      } else {
        throw Error();
      }
    } catch (e) {
      this.LOG.error('Erro ao atualizar token de acesso', e);
      throw new Error('Não foi possível completar a busca dos dados');
    }
  }

  private isTokenValid(): boolean {
    return !!this.accessToken && Date.now() < this.accessToken.expires_after;
  }

  private getMusic(track: any): Music {
    const result: Music = {
      provider: MusicProvider.SPOTIFY,
      url: track.external_urls.spotify,
      title: track.name,
      duration: Math.ceil(track.duration_ms / 1000),
      author: {
        name: track.artists[0].name,
        url: track.artists[0].external_urls.spotify,
      },
    };

    if (track.album && track.album.images && track.album.images.length) {
      result.thumb = track.album.images[0].url;
    }

    return result;
  }

  private async fetchPlaylist(id: string): Promise<TracksResult> {
    try {
      const data = await axios.get(
        `${API_URL}/playlists/${id}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken?.access_token}`
          }
        }
      ).then(r => r.data);

      let next = data.tracks.next;

      while (!!next) {
        const tracks = await axios.get(next, {
          headers: {
            Authorization: `Bearer ${this.accessToken?.access_token}`,
          },
        }).then(r => r.data);

        data.tracks.items.push(...tracks.items);

        next = data.next;
      }

      const result: Playlist = {
        url: data.external_urls.spotify,
        title: data.name,
        description: data.description,
        author: {
          url: data.owner.external_urls.spotify,
          name: data.owner.display_name,
        },
        items: data.tracks.items.map((it: any) => this.getMusic(it.track)),
      };

      if (data.images && data.images.length) {
        result.thumb = data.images[0].url;
      }

      return { isPlaylist: true, result };
    } catch (e) {
      this.LOG.error('Erro ao buscar dados na api do spotify', e);
      throw new Error('Não foi possível buscar a playlist no spotify');
    }
  }

  private async fetchTrack(id: string): Promise<TracksResult> {
    try {
      const data = await axios.get(
        `${API_URL}/tracks/${id}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken?.access_token}`
          }
        }
      ).then(r => r.data);

      return { isPlaylist: false, result: this.getMusic(data) };
    } catch (e) {
      this.LOG.error('Erro ao buscar dados na api do spotify', e);
      throw new Error('Não foi possível buscar a musica no spotify');
    }
  }

  private async fetchAlbum(id: string): Promise<TracksResult> {
    try {
      const data = await axios.get(
        `${API_URL}/albums/${id}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken?.access_token}`
          }
        }
      ).then(r => r.data);

      const result: Playlist = {
        url: data.external_urls.spotify,
        title: data.name,
        description: null,
        author: {
          url: data.artists[0].external_urls.spotify,
          name: data.artists[0].name,
        },
        items: data.tracks.items.map((it: any) => this.getMusic(it)),
      };

      if (data.images && data.images.length) {
        result.thumb = data.images[0].url;
      } 

      return { isPlaylist: true, result };
    } catch (e) {
      this.LOG.error('Erro ao buscar dados na api do spotify', e);
      throw new Error('Não foi possível buscar a musica no spotify');
    }
  }

  async getTracks(url: string) {
    if (!this.isUrlValid(url)) {
      throw new Error('A url informada não é uma url do spotify');
    }

    try {
      if (!this.isTokenValid()) {
        await this.requestToken();
      }

      if (!this.isTokenValid()) {
        throw new Error();
      }

      const urlData = parse(url);

      switch (urlData.type) {
        case 'playlist':
          return this.fetchPlaylist(urlData.id);
        case 'track':
          return this.fetchTrack(urlData.id);
        case 'album':
          return this.fetchAlbum(urlData.id);
        default:
          throw new Error();
      }
    } catch (e) {
      this.LOG.error('Erro ao buscar dados', e);
      throw new Error('Não foi possível buscar os dados com a url informada');
    }
  }
}
