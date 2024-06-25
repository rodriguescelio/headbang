import MusicProvider from './musicProvider';

interface Music {
  provider: MusicProvider;
  title: string;
  url: string;
  duration: number;
  thumb?: string;
  author: {
    name: string;
    url: string;
  };
}

export default Music;
