import Music from "./music";
import Playlist from "./playlist";

interface TracksResult {
  isPlaylist: boolean;
  result: Playlist | Music; 
}

export default TracksResult;
