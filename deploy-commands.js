const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

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
            if (command.data && typeof command.data.toJSON === 'function') {
                commands.push(command.data.toJSON());
                console.log(`Loaded command: ${command.data.name}`);
            }
        }
    }
}

loadCommands('commands');

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();