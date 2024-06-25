import Music from './music';

interface Playlist {
  title: string;
  description: string | null;
  url: string;
  thumb?: string;
  author: {
    name: string;
    url: string | null;
    avatar?: string;
  };
  items: Music[];
}

export default Playlist;
