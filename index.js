const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ] 
});

client.commands = new Collection();
const commands = [];

function loadCommands(dir) {
    const commandsPath = path.join(__dirname, dir);
    const items = fs.readdirSync(commandsPath);

    for (const item of items) {
        const itemPath = path.join(commandsPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            loadCommands(path.join(dir, item));
        } else if (item.endsWith('.js')) {
            const command = require(itemPath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
                console.log(`[INFO] Loaded command: ${command.data.name}`);
            } else {
                console.log(`[WARNING] The command at ${itemPath} is missing a required "data" or "execute" property.`);
            }
        }
    }
}

loadCommands('commands');

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.existsSync(eventsPath)
    ? fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'))
    : [];

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`[DEPLOY] Started refreshing ${commands.length} application (/) commands.`);
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log(`[DEPLOY] Successfully reloaded application (/) commands.`);
        client.login(process.env.TOKEN);
    } catch (error) {
        console.error('[DEPLOY ERROR]', error);
    }
})();