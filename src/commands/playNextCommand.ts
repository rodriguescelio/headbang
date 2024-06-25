import { autoInjectable } from 'tsyringe';
import PlayCommand from './playCommand';
import SpotifyProvider from '../providers/spotifyProvider';
import YoutubeProvider from '../providers/youtubeProvider';
import DeezerProvider from '../providers/deezerProvider';
import QueueManagerService from '../services/queueManagerService';
import { ChatInputCommandInteraction } from 'discord.js';

@autoInjectable()
export default class PlayNextCommand extends PlayCommand {
  constructor(
    spotifyProvider: SpotifyProvider,
    youtubeProvider: YoutubeProvider,
    deezerProvider: DeezerProvider,
    queueManagerService: QueueManagerService,
  ) {
    super(
      spotifyProvider,
      youtubeProvider,
      deezerProvider,
      queueManagerService,
    );
    this.trigger.name = 'playnext';
  }

  async exec(interaction: ChatInputCommandInteraction) {
    super.exec(interaction, true);
  }
}
