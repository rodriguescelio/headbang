const { Command } = require('discord-akairo');

class CleanCommand extends Command {

  constructor() {
    super('clean', {
      aliases: ['clean'],
    });
  }

  isBotAction(message, commands, expression) {
    let result = false;

    if (message.indexOf(this.handler.prefix) === 0) {
      const command = message.match(expression);

      if (command && command.length > 1) {
        result = commands.indexOf(command[1]) !== -1;
      }
    }

    return result;
  }

  async exec(event) {
    const commandList = Array.from(this.handler.aliases.keys());
    const botActionExpression = new RegExp(`${this.handler.prefix}([\\w]+)`);

    const messages = await event.channel.messages.fetch();

    const batch = messages.filter(it => {
      const isFromBot = it.author.id === this.client.user.id;
      return isFromBot || this.isBotAction(it.content, commandList, botActionExpression);
    });

    event.channel.bulkDelete(batch);
  }

}

module.exports = CleanCommand;
