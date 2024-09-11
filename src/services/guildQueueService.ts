import {
  APIActionRowComponent,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  TextChannel,
  User,
} from 'discord.js';
import { autoInjectable } from 'tsyringe';
import {
  AudioPlayer,
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnection,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  joinVoiceChannel,
} from '@discordjs/voice';
import Music from '../types/music';
import MusicProvider from '../types/musicProvider';
import YoutubeProvider from '../providers/youtubeProvider';
import Headbang from '../headbang';
import QueueMusic from '../types/queueMusic';
import DateTime from '../utils/dateTime';
import EventEmmiter from 'node:events';
import { Logger, getLogger } from 'log4js';
import { createWriteStream, createReadStream } from 'node:fs';
import ytdl from 'ytdl-core';

@autoInjectable()
export default class GuildQueueService extends EventEmmiter {
  private LOG: Logger;

  guildId?: string;
  messageChannelId?: string;

  private connection?: VoiceConnection;
  private player?: AudioPlayer;

  private musics: QueueMusic[] = [];
  private currentMusicIndex = -1;
  private message?: any;

  private shuffleQueue: boolean = false;
  private shufflePlayed: number[] = [];

  constructor(
    private headbang?: Headbang,
    private youtubeProvider?: YoutubeProvider,
  ) {
    super();
    this.LOG = getLogger('GuildQueueService');
  }

  async init(interaction: ChatInputCommandInteraction, list: Music[]) {
    const member = interaction.member as GuildMember;

    this.guildId = member.guild.id;
    this.messageChannelId = interaction.channelId;

    this.setMusics(interaction.user, list);

    this.connection = joinVoiceChannel({
      channelId: member.voice.channelId!,
      guildId: this.guildId,
      adapterCreator: member.guild.voiceAdapterCreator,
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);

    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    this.connection.on('error', this.onConnectionError.bind(this));
    this.connection.on('stateChange', this.onConnectionStateChange.bind(this));
    this.connection.on(
      VoiceConnectionStatus.Disconnected,
      this.onConnectionDisconnect.bind(this),
    );

    this.player.on('error', this.onPlayerError.bind(this));
    this.player.on(AudioPlayerStatus.Idle, this.onPlayerIdle.bind(this));

    this.connection.subscribe(this.player);

    this.next();
  }

  private setMusics(user: User, list: Music[], appendNext: boolean = false) {
    const author = {
      name: user.globalName || user.username,
      icon: user.displayAvatarURL({ size: 32 }),
    };

    const musics = list.map((music) => {
      const queueMusic: QueueMusic = {
        author,
        originalMusic: music,
      };

      if (music.provider === MusicProvider.YOUTUBE) {
        queueMusic.youtubeMusic = music;
      }

      return queueMusic;
    });

    if (appendNext) {
      const index = this.shuffleQueue
        ? this.shufflePlayed[this.shufflePlayed.length - 1]
        : this.currentMusicIndex;

      this.musics.splice(index + 1, 0, ...musics);
    } else {
      this.musics.push(...musics);
    }
  }

  private onConnectionError(e: any) {
    this.LOG.error('Ocorreu um erro na conexão com o canal de voz', e);
    this.onPlayerIdle();
  }

  private onConnectionStateChange(oldState: any, newState: any) {
    if (
      oldState.status === VoiceConnectionStatus.Ready &&
      newState.status === VoiceConnectionStatus.Connecting
    ) {
      this.connection?.configureNetworking();
    }
  }

  private onConnectionDisconnect() {
    const channel = this.headbang?.client.channels.cache.get(
      this.messageChannelId!,
    ) as TextChannel;

    if (channel) {
      channel.send('Me removero aqui ó!!');
    }

    this.stop();
  }

  private onPlayerError(e: any) {
    this.LOG.error('Ocorreu um erro com o player', e);
    this.onPlayerIdle();
  }

  private onPlayerIdle() {
    if (this.isDisableNext()) {
      this.stop();
    } else {
      this.next();
    }
  }

  stop() {
    this.musics = [];
    this.player?.stop(true);
    this.connection?.destroy();

    if (this.message) {
      this.message.delete();
      this.message = null;
    }

    this.emit('removeQueue', this.guildId);
  }

  prev() {
    if (this.shuffleQueue) {
      if (this.shufflePlayed.length > 1) {
        this.currentMusicIndex =
          this.shufflePlayed[this.shufflePlayed.length - 2];
      }
    } else if (this.currentMusicIndex > 0) {
      this.currentMusicIndex--;
    }
    this.play();
  }

  next() {
    if (this.shuffleQueue) {
      this.random();
    } else if (this.currentMusicIndex + 1 < this.musics.length) {
      this.currentMusicIndex++;
      this.play();
    }
  }

  random() {
    let index;

    do {
      index = Math.floor(Math.random() * this.musics.length - 1);
    } while (index < 0 || this.shufflePlayed.indexOf(index) !== -1);

    this.shufflePlayed.push(index);
    this.currentMusicIndex = index;

    this.play();
  }

  toggleShuffle() {
    this.shuffleQueue = !this.shuffleQueue;

    if (this.shuffleQueue) {
      this.shufflePlayed = [];
    }

    this.sendMessage(true);
  }

  restart() {
    this.play();
  }

  private isDisablePrev() {
    return this.shuffleQueue
      ? this.shufflePlayed.length < 2
      : this.currentMusicIndex === 0;
  }

  private isDisableNext() {
    return (
      this.musics.length ===
      (this.shuffleQueue
        ? this.shufflePlayed.length
        : this.currentMusicIndex + 1)
    );
  }

  private async sendMessage(update: boolean = false) {
    const item = this.musics[this.currentMusicIndex];

    const channel = this.headbang?.client.channels.cache.get(
      this.messageChannelId!,
    ) as TextChannel;

    if (channel) {
      const embed = new EmbedBuilder().setColor(0xcc8980).setAuthor({
        name: 'Tocando agora:',
      });

      if (item.author) {
        embed.setFooter({
          text: `Solicitado por: ${item.author.name}`,
          iconURL: item.author.icon,
        });
      }

      embed
        .setTitle(item.youtubeMusic ? item.youtubeMusic.title : '')
        .setDescription(`Artista: ${item.youtubeMusic!.author.name}`)
        .setURL(item.youtubeMusic!.url)
        .addFields(
          {
            name: 'Duração da música:',
            value: DateTime.toTime(item.youtubeMusic!.duration),
          },
          {
            name: 'Duração restante da fila:',
            value: DateTime.toTime(
              this.getRemaining() - item.youtubeMusic!.duration,
            ),
          },
        );

      if (item.youtubeMusic!.thumb) {
        embed.setThumbnail(item.youtubeMusic!.thumb);
      }

      const actions = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('play-prev')
          .setLabel('\u23F4 voltar')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(this.isDisablePrev()),
        new ButtonBuilder()
          .setCustomId('play-next')
          .setLabel('\u23F5 avançar')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(this.isDisableNext()),
        new ButtonBuilder()
          .setCustomId('play-shuffle')
          .setLabel('\u292D aleatório')
          .setStyle(
            this.shuffleQueue ? ButtonStyle.Success : ButtonStyle.Secondary,
          ),
        new ButtonBuilder()
          .setCustomId('play-restart')
          .setLabel('\u2B6F recomeçar')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('play-clear')
          .setLabel('\u2715 limpar')
          .setStyle(ButtonStyle.Secondary),
      );

      const args = {
        embeds: [embed],
        components: [actions as unknown as APIActionRowComponent<any>],
      };

      if (this.message && update) {
        this.message.edit(args);
      } else {
        if (this.message) {
          await this.message.delete();
        }
        this.message = await channel.send(args);
      }
    }
  }

  private createResourceFrom(audio: any) {
    return createAudioResource(audio.stream, { inputType: audio.type });
  }

  private async play() {
    const item = this.musics[this.currentMusicIndex];

    try {
      if (!item.youtubeMusic) {
        const search = await this.youtubeProvider?.search(
          `${item.originalMusic.title} - ${item.originalMusic.author.name}`,
        );

        if (search) {
          item.youtubeMusic = search;
        } else {
          throw new Error('Video não encontrado');
        }
      }

      let resource;

      switch (process.env.VIDEO_SOURCE) {
        case 'ytdl':
          resource = createAudioResource(
            this.youtubeProvider!.getStreamYtDl(item.youtubeMusic.url),
          );
          break;
        case 'yt-stream':
          resource = this.createResourceFrom(
            await this.youtubeProvider!.getStreamYtStream(
              item.youtubeMusic.url,
            ),
          );
          break;
        case 'play-dl':
        default:
          resource = this.createResourceFrom(
            await this.youtubeProvider!.getStreamPlayDl(item.youtubeMusic.url),
          );
          break;
      }

      this.player?.play(resource);

      this.sendMessage();
    } catch (e) {
      this.LOG.error(
        `Erro ao buscar stream do vídeo: ${
          (item.youtubeMusic || item.originalMusic).url
        }`,
        e,
      );
      this.onPlayerIdle();
    }
  }

  append(
    interaction: ChatInputCommandInteraction,
    list: Music[],
    appendNext: boolean,
  ) {
    this.setMusics(interaction.user, list, appendNext);
  }

  getDuration() {
    return this.musics.reduce(
      (t: number, it: QueueMusic) =>
        t +
        (it.youtubeMusic
          ? it.youtubeMusic.duration
          : it.originalMusic.duration),
      0,
    );
  }

  getRemaining() {
    let remaining = 0;

    if (this.shuffleQueue) {
      remaining = this.musics
        .filter((_, index) => this.shufflePlayed.indexOf(index) === -1)
        .reduce(
          (t: number, it: QueueMusic) =>
            t +
            (it.youtubeMusic
              ? it.youtubeMusic.duration
              : it.originalMusic.duration),
          0,
        );
    } else if (this.currentMusicIndex === -1) {
      remaining = this.getDuration();
    } else {
      for (let i = this.currentMusicIndex; i < this.musics.length; i++) {
        const it = this.musics[i];
        remaining += it.youtubeMusic
          ? it.youtubeMusic.duration
          : it.originalMusic.duration;
      }
    }

    return remaining;
  }
}
