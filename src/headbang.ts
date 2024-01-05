import { Client, GatewayIntentBits } from "discord.js";
import { singleton } from "tsyringe";
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

@singleton()
export default class Headbang {
  client: Client;

  private listenersDir: string;
  private commandsDir: string;

  listeners: any[] = [];
  commands: any[] = [];

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
      ]
    });

    this.listenersDir = join(__dirname, 'listeners');
    this.commandsDir = join(__dirname, 'commands');
  }

  private async newInstance(dir: string, file: string) {
    const classFile = await import(join(dir, file));
    return new classFile.default();
  }
  
  private async loadListeners() {
    for await (const file of (await readdir(this.listenersDir))) {
      const listener = await this.newInstance(this.listenersDir, file);

      if (listener.once) {
        this.client.once(listener.event, listener.exec.bind(listener));
      } else {
        this.client.on(listener.event, listener.exec.bind(listener));
      }

      this.listeners.push(listener);
    }
  }

  private async loadCommands() {
    for await (const file of (await readdir(this.commandsDir))) {
      this.commands.push(await this.newInstance(this.commandsDir, file));
    }
  }

  async init() {
    await this.loadListeners();
    await this.loadCommands();
  }

  start() {
    this.client.login(process.env.DISCORD_BOT_TOKEN);
  }
}

