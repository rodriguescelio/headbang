import { Events, Interaction } from 'discord.js';
import Headbang from '../headbang';
import { autoInjectable } from 'tsyringe';

@autoInjectable()
export default class InteractionListener {
  event = Events.InteractionCreate;

  constructor(private headbang: Headbang) {}

  async exec(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const command = this.headbang.commands.find(
        (it) => it.trigger.name === interaction.commandName,
      );
      if (command) {
        command.exec(interaction);
      }
    } else if (interaction.isButton()) {
      const args = interaction.customId.split('-');
      const command = this.headbang.commands.find(
        (it) => it.trigger.name === args[0],
      );
      if (command) {
        command.onInteraction(args[1], interaction);
      }
    }
  }
}
