const { Command } = require('discord-akairo');

class QueueCommand extends Command {

  constructor() {
    super('queue', {
      aliases: ['q', 'queue'],
    });
    this.responses = [];
    this.limit = 10;
  }

  async exec(event) {
    const guildId = event.channel.guild.id;
    const queue = this.client.voiceService.getQueue(guildId);

    if (queue) {
      let response = this.responses.find(it => it.guildId === guildId);

      if (response) {
        response.message.delete();
      } else {
        response = { guildId, page: 0 };
        this.responses.push(response);
      }

      const list = Array.from(
        Array(this.limit),
        (_, i) => {
          const index = i + (response.page * this.limit);
          const item = queue.list[index];
          let result = null;

          if (item) {
            result = index === queue.current ? `**(${index + 1}) - ${item.title}**` : `(${index + 1}) - ${item.title}`;
          }

          return result;
        }
      ).filter(it => !!it);

      response.message = await event.channel.send(list.join('\n'));
      this.handleReaction(response, queue.list.length);
    } else {
      event.channel.send('Empty queue!');
    }
  }

  async handleReaction(response, queueSize) {
    if (response.page !== 0) {
      await response.message.react('⬅️');
    }

    if ((response.page + 1) < Math.ceil(queueSize / this.limit)) {
      await response.message.react('➡️');
    }

    response.message.awaitReactions(
      (reaction) => ['⬅️', '➡️'].indexOf(reaction.emoji.name) !== -1,
      { max: 1, time: 60000 }
    ).then(event => {
      const next = event.get('➡️');
      const prev = event.get('⬅️');

      if (next) {
        response.page++;
        this.exec(next.message);
      } else if (prev) {
        response.page--;
        this.exec(prev.message);
      }
    })
    .catch(err => console.log('error', err));
  }
}

module.exports = QueueCommand;
