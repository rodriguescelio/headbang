const { MessageEmbed } = require('discord.js');
const {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnectionStatus,
} = require('@discordjs/voice');

class VoiceService {
  constructor(youtubeService) {
    this.youtubeService = youtubeService;
    this.quitIntervals = [];
    this.connections = [];
    this.queues = [];
  }

  embed(content) {
    return {embeds: [new MessageEmbed().setColor('#ff6600').setDescription(content)]};
  }

  async stablishConnection(event) {
    const guildId = event.channel.guild.id;

    if (event.member.voice.channel) {
      let connection = this.connections.find(it => it.guildId === guildId);
      if (!connection) {
        const channel = event.member.voice.channel;
        connection = joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator,
        });
        connection.on('disconnect', () => this.handleDisconnection(guildId));
        this.connections.push({ guildId, connection, event });
      }
      return true;
    }

    return false;
  }

  async handleDisconnection(guildId) {
    const connection = this.connections.find(it => it.guildId === guildId);
    if (connection) {
      await connection.event.channel.send('I got kicked out of the voice channel! Now, silence.');
      this.queues = this.queues.filter(it => it.guildId !== guildId);
      this.connections = this.connections.filter(it => it.guildId !== guildId);
    }
  }

  async enqueue(event, list, appendNext) {
    if (await this.stablishConnection(event)) {
      const guildId = event.channel.guild.id;
      const queue = this.queues.find(it => it.guildId === guildId);
      if (queue) {
        if (appendNext) {
          queue.list.splice(queue.current + 1, 0, ...list);
        } else {
          queue.list.push(...list);
        }
      } else {
        this.queues.push({
          current: -1,
          guildId,
          list,
        });
        this.nextOnQueue(guildId);
      }
      console.log(`${__dirname} ::  linha: 73`)
      // event.channel.send(this.embed(`Queued ${list.length} tracks`));
      event.channel.send(`Queued ${list.length} tracks`);
      console.log(`${__dirname} ::  linha: 75`, this.embed(`Queued ${list.length} tracks`))
    }
  }

  async nextOnQueue(guildId) {
    const connection = this.connections.find(it => it.guildId === guildId);
    const queue = this.queues.find(it => it.guildId === guildId);

    if (connection && queue) {
      if (queue.list.length > 0 && queue.current + 1 < queue.list.length) {
        queue.current++;
        this.play(guildId, connection, queue, 0);
      } else {
        this.createQuitInterval(guildId);
      }
    }
  }

  async prevOnQueue(guildId) {
    const connection = this.connections.find(it => it.guildId === guildId);
    const queue = this.queues.find(it => it.guildId === guildId);

    if (connection && queue) {
      if (queue.list.length > 0 && queue.current > 0) {
        queue.current--;
        this.play(guildId, connection, queue, 0);
      } else {
        this.createQuitInterval(guildId);
      }
    }
  }

  async play(guildId, connection, queue, retries) {
    const item = queue.list[queue.current];    
    if (item.from === 'spotify' || item.from === 'amazon_music') {
      const search = await this.youtubeService.search(item.title);
      if (search) {
        item.title = search.title;
        item.url = search.url;
      } else {
        this.nextOnQueue(guildId);
        return;
      }
    }


    const readable = await this.youtubeService.getStream(item.url);

    const audioPlayer = createAudioPlayer();
    connection.connection.subscribe(audioPlayer);

    audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.nextOnQueue(guildId)
    });

    audioPlayer.play(createAudioResource(readable));

    if (retries === 0) {
      if (queue.messageEvent) {
        await queue.messageEvent.delete();
      }

      queue.messageEvent = await connection.event.channel.send(
        this.embed(`Playing: [${item.title}](${item.url}) [<@${item.author}>]`)
      );
    }
  }

  createQuitInterval(guildId) {
    if (this.quitIntervals.find(it => it.guildId === guildId) === undefined) {
      this.quitIntervals.push({
        guildId,
        interval: setTimeout(() => this.quit(guildId, false), 10000),
      });
    }
  }

  quit(guildId, force) {
    this.quitIntervals = this.quitIntervals.filter(it => it.guildId !== guildId);
    const connection = this.connections.find(it => it.guildId === guildId);
    if (connection) {
      if (connection.connection.state.networking.state.connectionData && connection.connection.state.networking.state.connectionData.speaking && !force) {
        this.quitIntervals.push({
          guildId,
          interval: setTimeout(() => this.quit(guildId, false), 10000),
        });
      } else {
        this.queues = this.queues.filter(it => it.guildId !== guildId);
        this.connections = this.connections.filter(it => it.guildId !== guildId);
        connection.connection.disconnect();
      }
    }
  }

  getQueue(guildId) {
    const queue = this.queues.find(it => guildId === it.guildId);
    return queue || null;
  }

  shuffleQueue(guildId) {
    let result = false;
    const queue = this.queues.find(it => guildId === it.guildId);

    if (queue && queue.list.length > 0) {
      const currentItem = queue.list.splice(queue.current, 1);
      queue.list.sort(() => Math.random() - 0.5);
      queue.list.unshift(...currentItem);
      queue.current = 0;
      result = true;
    }

    return result;
  }

  jumpQueueTo(guildId, queueIndex) {
    const connection = this.connections.find(it => it.guildId === guildId);
    const queue = this.queues.find(it => it.guildId === guildId);

    if (connection && queue) {
      if (queueIndex > 0 && queueIndex <= queue.list.length) {
        queue.current = queueIndex - 1;
        this.play(guildId, connection, queue, 0);
      }
    }
  }
}

module.exports = VoiceService;
