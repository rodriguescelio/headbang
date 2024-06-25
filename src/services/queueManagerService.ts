import { singleton } from 'tsyringe';
import GuildQueueService from './guildQueueService';
import { ChatInputCommandInteraction, GuildMember } from 'discord.js';
import Music from '../types/music';

@singleton()
export default class QueueManagerService {
  private queues: GuildQueueService[] = [];

  enqueue(
    interaction: ChatInputCommandInteraction,
    musics: Music[],
    appendNext: boolean,
  ): GuildQueueService {
    if (!(interaction.member as GuildMember).voice.channel) {
      throw new Error(
        '⛔ Para reproduzir músicas você precisa estar em um canal de voz!',
      );
    }

    let queue = this.queues.find(
      (it) => it.guildId === (interaction.member as GuildMember).guild.id,
    );

    if (queue) {
      queue.append(interaction, musics, appendNext);
    } else {
      queue = new GuildQueueService();

      queue.init(interaction, musics);
      queue.once('removeQueue', this.removeQueue.bind(this));

      this.queues.push(queue);
    }

    return queue;
  }

  getQueue(member: GuildMember) {
    return this.queues.find((it) => it.guildId === member.guild.id);
  }

  removeQueue(guildId: string) {
    const index = this.queues.findIndex((it) => it.guildId === guildId);
    if (index >= 0) {
      this.queues.splice(index, 1);
    }
  }
}
