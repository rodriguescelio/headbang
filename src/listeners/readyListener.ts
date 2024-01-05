import { Events, Routes } from "discord.js";
import Headbang from "../headbang";
import { autoInjectable } from "tsyringe";
import { Logger, getLogger } from "log4js";

@autoInjectable()
export default class ReadyListener {
  once = true;
  event = Events.ClientReady;

  LOG: Logger;

  constructor(private headbang?: Headbang) {
    this.LOG = getLogger('ReadyListener');
  }

  async exec() {
    this.LOG.info('Registrando comandos...');

    this.headbang!.client.rest.put(
      Routes.applicationCommands(this.headbang!.client.user!.id),
      { body: this.headbang?.commands.map(it => it.trigger) }
    );

    this.LOG.info('Headbang está pronto!');
  }
}
