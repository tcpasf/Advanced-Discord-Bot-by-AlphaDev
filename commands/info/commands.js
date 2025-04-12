const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commands')
        .setDescription('Display a list of all available commands with statistics')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('The category of commands to display')
                .setRequired(false)
                .addChoices(
                    { name: 'Info', value: 'info' },
                    { name: 'Moderation', value: 'moderation' },
                    { name: 'Admin', value: 'admin' },
                    { name: 'Games', value: 'games' },
                    { name: 'Welcome', value: 'welcome' },
                    { name: 'Giveaways', value: 'giveaways' },
                    { name: 'Tickets', value: 'tickets' },
                    { name: 'Utility', value: 'utility' }
                )),

    async execute(interaction) {
        const category = interaction.options.getString('category');
        
        // Get all command categories and counts
        const commandsInfo = getCommandsInfo();
        
        if (category) {
            // Display commands for a specific category
            await displayCategoryCommands(interaction, category, commandsInfo);
        } else {
            // Display main help menu with categories
            await displayMainHelp(interaction, commandsInfo);
        }
    },
    
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('commands_') && !interaction.customId.startsWith('help_')) {
            return;
        }
        
        const category = interaction.customId.split('_')[1];
        
        // Get all command categories and counts
        const commandsInfo = getCommandsInfo();
        
        // Display commands for the selected category
        await displayCategoryCommands(interaction, category, commandsInfo, true);
    }
};

function getCommandsInfo() {
    const commandsDir = path.join(__dirname, '..');
    const categories = fs.readdirSync(commandsDir);
    
    const commandsInfo = {
        totalCommands: 0,
        categories: {}
    };
    
    categories.forEach(category => {
        const categoryPath = path.join(commandsDir, category);
        
        // Skip if not a directory
        if (!fs.statSync(categoryPath).isDirectory()) {
            return;
        }
        
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        
        // Get commands in this category
        const commands = [];
        
        commandFiles.forEach(file => {
            try {
                const command = require(path.join(categoryPath, file));
                if (command.data && command.data.name) {
                    commands.push({
                        name: command.data.name,
                        description: command.data.description
                    });
                    commandsInfo.totalCommands++;
                }
            } catch (error) {
                console.error(`Error loading command ${file}:`, error);
            }
        });
        
        // Add category info
        commandsInfo.categories[category] = {
            name: getCategoryDisplayName(category),
            commands: commands,
            count: commands.length,
            emoji: getCategoryEmoji(category)
        };
    });
    
    return commandsInfo;
}

function getCategoryDisplayName(category) {
    const displayNames = {
        'admin': 'Admin',
        'games': 'Games',
        'giveaways': 'Giveaways',
        'info': 'Information',
        'moderation': 'Moderation',
        'tickets': 'Tickets',
        'utility': 'Utility',
        'welcome': 'Welcome'
    };
    
    return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function getCategoryEmoji(category) {
    const emojis = {
        'admin': '⚙️',
        'games': '🎮',
        'giveaways': '🎁',
        'info': 'ℹ️',
        'moderation': '🛡️',
        'tickets': '🎫',
        'utility': '🔧',
        'welcome': '👋'
    };
    
    return emojis[category] || '📁';
}

async function displayMainHelp(interaction, commandsInfo) {
    const embed = new EmbedBuilder()
        .setColor('#7289DA')
        .setTitle('Commands Menu')
        .setDescription(`Here are all the available command categories.\nTotal Commands: **${commandsInfo.totalCommands}**\n\nSelect a category to see its commands:`)
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .setFooter({ text: 'Developed by AlphaDev', iconURL: interaction.client.user.displayAvatarURL() });
    
    // Add fields for each category
    Object.entries(commandsInfo.categories).forEach(([categoryId, category]) => {
        embed.addFields({
            name: `${category.emoji} ${category.name}`,
            value: `${category.count} command${category.count === 1 ? '' : 's'}`,
            inline: true
        });
    });
    
    // Create buttons for each category (up to 5 per row)
    const rows = [];
    const categories = Object.entries(commandsInfo.categories);
    
    for (let i = 0; i < categories.length; i += 5) {
        const row = new ActionRowBuilder();
        
        for (let j = i; j < Math.min(i + 5, categories.length); j++) {
            const [categoryId, category] = categories[j];
            
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`commands_${categoryId}`)
                    .setLabel(category.name)
                    .setEmoji(category.emoji)
                    .setStyle(ButtonStyle.Primary)
            );
        }
        
        rows.push(row);
    }
    
    // Add a home button if needed for future navigation
    if (rows.length > 0 && rows[rows.length - 1].components.length < 5) {
        rows[rows.length - 1].addComponents(
            new ButtonBuilder()
                .setCustomId('commands_home')
                .setLabel('Home')
                .setEmoji('🏠')
                .setStyle(ButtonStyle.Secondary)
        );
    }
    
    await interaction.reply({ embeds: [embed], components: rows });
}

async function displayCategoryCommands(interaction, categoryId, commandsInfo, isButton = false) {
    // Handle home button
    if (categoryId === 'home') {
        return displayMainHelp(interaction, commandsInfo);
    }
    
    const category = commandsInfo.categories[categoryId];
    
    if (!category) {
        const errorEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Error')
            .setDescription(`Category "${categoryId}" not found.`);
        
        if (isButton) {
            await interaction.update({ embeds: [errorEmbed], components: [] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
        return;
    }
    
    const embed = new EmbedBuilder()
        .setColor('#7289DA')
        .setTitle(`${category.emoji} ${category.name} Commands`)
        .setDescription(`Here are all the commands in the ${category.name} category.\nTotal: **${category.count}** command${category.count === 1 ? '' : 's'}`)
        .setFooter({ text: 'Developed by AlphaDev', iconURL: interaction.client.user.displayAvatarURL() });
    
    // Add commands to the embed
    if (category.commands.length === 0) {
        embed.addFields({ name: 'No Commands', value: 'This category has no commands.' });
    } else {
        // Group commands by their base name (for commands with subcommands)
        const groupedCommands = {};
        
        category.commands.forEach(command => {
            const baseName = command.name.split('-')[0];
            
            if (!groupedCommands[baseName]) {
                groupedCommands[baseName] = [];
            }
            
            groupedCommands[baseName].push(command);
        });
        
        // Add each command group to the embed - limit to 25 fields max
        const commandGroups = Object.entries(groupedCommands);
        const maxFieldsPerEmbed = 25;
        
        // If we have more than 25 command groups, we need to consolidate them
        if (commandGroups.length > maxFieldsPerEmbed) {
            // Create a more compact representation
            let commandsList = '';
            
            commandGroups.forEach(([baseName, commands]) => {
                if (commands.length === 1) {
                    // Single command
                    const command = commands[0];
                    commandsList += `• **/${command.name}** - ${command.description}\n`;
                } else {
                    // Command group
                    commandsList += `• **${baseName} Commands**: ${commands.map(cmd => `\`/${cmd.name}\``).join(', ')}\n`;
                }
            });
            
            embed.setDescription(`${embed.data.description}\n\n${commandsList}`);
        } else {
            // Add each command group as a field (we have 25 or fewer)
            commandGroups.forEach(([baseName, commands]) => {
                if (commands.length === 1) {
                    // Single command
                    const command = commands[0];
                    embed.addFields({ 
                        name: `/${command.name}`, 
                        value: command.description 
                    });
                } else {
                    // Command group (likely with subcommands)
                    const commandNames = commands.map(cmd => `\`/${cmd.name}\``).join(', ');
                    embed.addFields({ 
                        name: `${baseName} Commands`, 
                        value: commandNames 
                    });
                }
            });
        }
    }
    
    // Create a button to go back to the main help menu
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('commands_home')
                .setLabel('Back to Categories')
                .setEmoji('🏠')
                .setStyle(ButtonStyle.Secondary)
        );
    
    if (isButton) {
        await interaction.update({ embeds: [embed], components: [row] });
    } else {
        await interaction.reply({ embeds: [embed], components: [row] });
    }
}