const { join } = require('path');
const { readdirSync } = require('fs');
const commandLineArgs = require('command-line-args');
const SpotifyService = require("./services/spotifyService");
const VoiceService = require("./services/voiceService");
const YoutubeService = require("./services/youtubeService");
const AmazonMusicService = require("./services/amazonMusicService");
const { Client, Intents } = require('discord.js');
const { parse } = require('discord-command-parser');

class HeadBang extends Client {
  constructor(config) {
    super({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.MESSAGE_CONTENT] });


    if (!config) {
      throw new Error('Config required');
    }
    
    this.config = config;
    this.commands = [];

    this.spotifyService = new SpotifyService();
    this.youtubeService = new YoutubeService();
    this.amazonMusicService = new AmazonMusicService();

    this.voiceService = new VoiceService(this.youtubeService);

    this.registerEvents();
    this.registerCommands();
  }

  registerEvents() {
    this.on('ready', () => console.log(`Connected as ${this.user.tag}`));
    this.on('messageCreate', this.onMessage);
    this.on('interaction', this.onInteraction);
  }

  onInteraction(interaction) {
    console.log(">>>>>>>>interaction<<<<<<<<<<<<<<<");
    this.commands.forEach(it => {
      if (it.onInteraction) {
        it.onInteraction(interaction);
      }
    })
  }

  registerCommands() {
    readdirSync(this.config.commands).forEach(file => {
      const commandClass = require(join(this.config.commands, file));
      if (typeof commandClass === 'function') {
        const instance = new commandClass(this);
        if (!instance.command && !instance.conditional) {
          throw new Error(`Invalid command declaration ${file}`);
        }
        this.commands.push(instance);
      }
    });
  }

  runCommand(message, command, action) {
    let args = {};
    if (command.args) {
      args = commandLineArgs(command.args, {
        argv: action.arguments,
        partial: true,
      });
    }
    command.exec(message, args, action.command);
  }

  onMessage(message) {
    const action = parse(message, this.config.prefix);
    console.log("onMessage");
    if (action.success) {
      const command = this.commands.find(it => it.command && it.command.toLowerCase() === action.command.toLowerCase());
      if (command) {
        this.runCommand(message, command, action);
      } else {
        this.commands
          .filter(it => it.conditional)
          .forEach(command => this.runCommand(message, command, action));
      }
    }
  }
}

module.exports = HeadBang;
