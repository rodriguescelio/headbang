import Music from './music';

interface QueueMusic {
  author: {
    name: string;
    icon: string;
  };
  originalMusic: Music;
  youtubeMusic?: Music;
}

export default QueueMusic;
