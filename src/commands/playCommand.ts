import { ButtonInteraction, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { autoInjectable } from "tsyringe";
import QueueManagerService from "../services/queueManagerService";
import TracksResult from "../types/tracksResult";
import Playlist from "../types/playlist";
import Music from "../types/music";
import DateTime from "../utils/dateTime";
import SpotifyProvider from "../providers/spotifyProvider";
import YoutubeProvider from "../providers/youtubeProvider";
import DeezerProvider from "../providers/deezerProvider";

@autoInjectable()
export default class PlayCommand {
  trigger = {
    name: "play",
    description: "Reproduzir musica/playlist no canal de voz atual",
    options: [
      {
        type: 3,
        name: "value",
        description: "Termo para busca ou url da musica/playlist de um dos serviços: Youtube, Spotify ou Deezer",
        required: true
      }
    ],
  };

  private providers: any[];

  constructor(
    spotifyProvider: SpotifyProvider,
    youtubeProvider: YoutubeProvider,
    deezerProvider: DeezerProvider,
    private queueManagerService: QueueManagerService
  ) {
    this.providers = [youtubeProvider, spotifyProvider, deezerProvider];
  }

  private isEasterEgg(interaction: ChatInputCommandInteraction, tracks: TracksResult, originalUrl: string): boolean {
    if (process.env.LOFI_EASTEREGG_ENABLE === "true" && process.env.LOFI_EASTEREGG_IMAGE) {
      let name = null;

      if (tracks.isPlaylist) {
        name = (tracks.result as Playlist).title.toLowerCase();
      } else {
        name = (tracks.result as Music).title.toLowerCase();
      }

      const isLoFi = name.replace(/[\s-]/g, '').indexOf('lofi') !== -1 
                      && !(new URLSearchParams(originalUrl).has('well'));

      if (isLoFi) {
        interaction.followUp(process.env.LOFI_EASTEREGG_IMAGE);
      }

      return isLoFi;
    }

    return false;
  }

  async exec(interaction: ChatInputCommandInteraction, appendNext?: boolean) {
    await interaction.deferReply({ fetchReply: true });

    const value = interaction.options.getString('value')!;

    try {
      const provider = this.providers.find(it => it.isUrlValid(value));

      if (!provider) {
        throw new Error(`Não foi possível reproduzir a url informada!`);
      }

      const tracks: TracksResult = await provider.getTracks(value);

      if (this.isEasterEgg(interaction, tracks, value)) {
        return;
      }

      const items = tracks.isPlaylist 
        ? (tracks.result as Playlist).items
        : [tracks.result as Music];

      const queue = this.queueManagerService.enqueue(interaction, items, appendNext || false);

      const embed  = new EmbedBuilder()
        .setColor(0xCC8980)
        .setTimestamp()
        .setFooter({
          text: `Solicitado por: ${interaction.user.globalName || interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ size: 64 }),
        });

      if (tracks.isPlaylist) {
        const playlist = tracks.result as Playlist;

        embed
          .setTitle(playlist.title)
          .setURL(playlist.url)
          .setDescription(`${playlist.items.length} música(s) adicionada(s) à fila`)
          .addFields(
            { 
              name: 'Duração das músicas adicionadas:',
              value: DateTime.toTime(playlist.items.reduce((total: number, item: Music) => total + item.duration, 0)),
            },
            {
              name: 'Duração total da fila:',
              value: DateTime.toTime(queue.getDuration()),
            },
            {
              name: 'A reproduzir',
              value: DateTime.toTime(queue.getRemaining()),
            }
          );

        if (playlist.author) {
          embed.setAuthor({
            name: playlist.author.name,
            url: playlist.author.url || undefined,
            iconURL: playlist.author.avatar
          });
        }

        if (playlist.thumb) {
          embed.setThumbnail(playlist.thumb);
        }
      } else {
        const music = tracks.result as Music;

        embed
          .setTitle(music.title)
          .setURL(music.url)
          .setDescription('Música adicionada à fila')
          .addFields(
            { 
              name: 'Duração da música',
              value: DateTime.toTime(music.duration),
              inline: true,
            },
            {
              name: 'Duração da fila',
              value: DateTime.toTime(queue.getDuration()),
              inline: true,
            },
          )

        if (music.author) {
          embed.setAuthor({
            name: music.author.name,
            url: music.author.url || undefined,
          });
        }

        if (music.thumb) {
          embed.setThumbnail(music.thumb);
        }
      }

      interaction.followUp({ embeds: [embed] });
    } catch (e: any) {
      interaction.followUp(e.message);
    }
  }

  async onInteraction(actionId: string, interaction: ButtonInteraction) {
    const queue = this.queueManagerService
                        .getQueue(interaction.member as GuildMember);

    await interaction.update({});

    if (queue) {
      switch(actionId) {
        case 'prev':
          queue.prev();
          break;
        case 'next':
          queue.next();
          break;
        case 'shuffle':
          queue.toggleShuffle();
          break;
        case 'restart':
          queue.restart();
          break;
        case 'clear':
          queue.stop();
          break;
      }
    }
  }
}
