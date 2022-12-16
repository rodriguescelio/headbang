const { MessageEmbed } = require('discord.js');

const PREV_ICON = '⬅️';
const NEXT_ICON = '➡️';
const ICONS = [PREV_ICON, NEXT_ICON];

class QueueCommand {

  constructor(client) {
    this.client = client;
    this.command = 'q';
    this.responses = [];
    this.limit = 10;
  }

  async exec(event, _, editMessage) {
    const guildId = event.channel.guild.id;
    const queue = this.client.voiceService.getQueue(guildId);

    if (queue) {
      let response = this.responses.find(it => it.guildId === guildId);

      if (!response) {
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
            const title = `${index + 1} - [${item.title}](${item.url})`;
            result = index === queue.current ? `**${title}**` : title;
          }

          return result;
        }
      ).filter(it => !!it);

      const messageContent = {embeds: [new MessageEmbed().setColor('#ff6600').setDescription(list.join('\n'))]};

      if (response.message && editMessage) {
        response.message = await response.message.edit(messageContent);
      } else {
        response.message = await event.channel.send(messageContent);
        await this.react(response.message);
      }

      // this.handleReaction(response, queue.list.length);
    } else {
      event.channel.send('Empty queue!');
    }
  }

  async onInteraction(interaction) {
    try {
      if (interaction.isButton() && interaction.customId.indexOf('audiosCommand') === 0) {
        const command = await this.client.databaseService.models.command.findOne({
          where: { 
            command: interaction.customId.replace('audiosCommand-', ''),
          },
        });
        
        if (command) {
          this.saveStatistic(command.command, interaction.user.id);
          const audio = await axios.get(command.audio, { responseType: 'arraybuffer' }).then(res => res.data);
          await this.client.voiceService.stream(interaction, audio);
          await interaction.deferUpdate();
        }
      }
    } catch (e) {
      if (e.request && e.response) {
        console.error(e.response.config.url, e.response.status, e.response.data.toString('utf8'), '\n');
      } else {
        console.error(e.message);
      } 
    }
  }

  async react(message) {
    await message.react(PREV_ICON);
    await message.react(NEXT_ICON);
  }

  async handleReaction(response, queueSize) {
    if (Math.ceil(queueSize / this.limit) > 1) {
      response.message.awaitReactions(
        (reaction) => ICONS.indexOf(reaction.emoji.name) !== -1,
        { max: 1, time: 60000 }
      ).then(event => {
        const action = event.get(PREV_ICON) || event.get(NEXT_ICON);

        if (action) {
          if (action.emoji.name === PREV_ICON) {
            if (response.page > 0) {
              response.page--;
            }
          } else {
            if (response.page + 1 < Math.ceil(queueSize / this.limit)) {
              response.page++;
            }
          }

          this.exec(action.message, null, true);

          Array.from(action.users.cache.keys())
            .filter(it => it !== action.message.author.id)
            .forEach(it => action.users.remove(it));
        }
      })
      .catch(err => console.log('error', err));
    }
  }
}

module.exports = QueueCommand;
