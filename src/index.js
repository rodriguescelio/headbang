const dotenv = require('dotenv');
const HeadBang = require('./client');
const { join } = require('path');

dotenv.config();

const client = new HeadBang({
    prefix: '-',
    commands: join(__dirname, 'commands'),
});

client.login(process.env.DISCORD_TOKEN);
