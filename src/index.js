const dotenv = require('dotenv');
const Client = require('./client');

dotenv.config();

const client = new Client();
client.login(process.env.DISCORD_TOKEN);
