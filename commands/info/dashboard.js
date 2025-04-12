const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const TranslationHelper = require('../../utils/translationHelper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Display a dashboard of bot features and statistics'),
    
    async execute(interaction) {
        // Create translation helper
        const t = TranslationHelper.fromInteraction(interaction);
        
        // Get command statistics
        const commandStats = getCommandStats();
        
        // Create main embed
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle(t.get('dashboard.title', { defaultValue: 'Bot Dashboard' }))
            .setDescription(t.get('dashboard.description', { 
                defaultValue: `Welcome to the dashboard for ${interaction.client.user.username}!\n\nThis bot offers a wide range of features to enhance your Discord server experience.`,
                botName: interaction.client.user.username
            }))
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: t.get('dashboard.stats.title', { defaultValue: '📊 Command Statistics' }), value: 
                    t.get('dashboard.stats.total', { defaultValue: `Total Commands: **${commandStats.total}**\n\n`, total: commandStats.total }) +
                    Object.entries(commandStats.categories)
                        .map(([category, count]) => t.get('dashboard.stats.category', { 
                            defaultValue: `**${category}:** ${count} commands`,
                            category: category,
                            count: count
                        }))
                        .join('\n'), inline: false },
                
                { name: t.get('dashboard.games.title', { defaultValue: '🎮 Games' }), value: 
                    t.get('dashboard.games.features', { 
                        defaultValue: '• Hangman\n• Rock Paper Scissors\n• Connect 4\n• Blackjack\n• Minesweeper\n• Tic Tac Toe'
                    }), inline: true },
                
                { name: t.get('dashboard.moderation.title', { defaultValue: '🛡️ Moderation' }), value: 
                    t.get('dashboard.moderation.features', { 
                        defaultValue: '• Ban/Kick/Mute\n• Warnings\n• Timeout\n• Channel Lock\n• Role Management'
                    }), inline: true },
                
                { name: t.get('dashboard.tickets.title', { defaultValue: '🎫 Ticket System' }), value: 
                    t.get('dashboard.tickets.features', { 
                        defaultValue: '• Custom Categories\n• User Management\n• Transcripts\n• Blacklist'
                    }), inline: true },
                
                { name: t.get('dashboard.welcome.title', { defaultValue: '👋 Welcome System' }), value: 
                    t.get('dashboard.welcome.features', { 
                        defaultValue: '• Custom Messages\n• Welcome Images\n• DM Messages\n• Auto Roles'
                    }), inline: true },
                
                { name: t.get('dashboard.giveaways.title', { defaultValue: '🎁 Giveaways' }), value: 
                    t.get('dashboard.giveaways.features', { 
                        defaultValue: '• Custom Duration\n• Multiple Winners\n• Role Requirements\n• Rerolls'
                    }), inline: true },
                
                { name: t.get('dashboard.utility.title', { defaultValue: '⚙️ Utility' }), value: 
                    t.get('dashboard.utility.features', { 
                        defaultValue: '• User Info\n• Server Info\n• Role Info\n• Avatar\n• Ping'
                    }), inline: true }
            )
            .setFooter({ text: t.get('dashboard.footer', { defaultValue: 'Developed by AlphaDev' }), iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
        
        // Create buttons for quick access to key commands
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('commands_home')
                    .setLabel(t.get('dashboard.buttons.commands', { defaultValue: 'Commands Menu' }))
                    .setEmoji('❓')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_games')
                    .setLabel(t.get('dashboard.buttons.games', { defaultValue: 'Games' }))
                    .setEmoji('🎮')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dashboard_welcome')
                    .setLabel(t.get('dashboard.buttons.welcome', { defaultValue: 'Welcome System' }))
                    .setEmoji('👋')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dashboard_giveaways')
                    .setLabel(t.get('dashboard.buttons.giveaways', { defaultValue: 'Giveaways' }))
                    .setEmoji('🎁')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dashboard_tickets')
                    .setLabel(t.get('dashboard.buttons.tickets', { defaultValue: 'Ticket System' }))
                    .setEmoji('🎫')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dashboard_moderation')
                    .setLabel(t.get('dashboard.buttons.moderation', { defaultValue: 'Moderation' }))
                    .setEmoji('🛡️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dashboard_utility')
                    .setLabel(t.get('dashboard.buttons.utility', { defaultValue: 'Utility' }))
                    .setEmoji('⚙️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dashboard_stats')
                    .setLabel(t.get('dashboard.buttons.stats', { defaultValue: 'Bot Stats' }))
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Success)
            );
        
        await interaction.reply({ embeds: [embed], components: [row1, row2] });
    },
    
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('dashboard_')) {
            return;
        }
        
        // Create translation helper
        const t = TranslationHelper.fromInteraction(interaction);
        
        const category = interaction.customId.split('_')[1];
        
        if (category === 'stats') {
            // Redirect to stats command
            const statsCommand = interaction.client.commands.get('stats');
            if (statsCommand) {
                // Use update instead of execute to avoid the interaction already replied error
                const commandStats = getCommandStats();
                const uptime = formatUptime(interaction.client.uptime);
                
                // Get system information
                const systemInfo = {
                    os: `${require('os').type()} ${require('os').release()}`,
                    cpu: require('os').cpus()[0].model,
                    memory: {
                        total: formatBytes(require('os').totalmem()),
                        free: formatBytes(require('os').freemem()),
                        usage: `${Math.round((require('os').totalmem() - require('os').freemem()) / require('os').totalmem() * 100)}%`
                    },
                    nodejs: process.version,
                    discordjs: `v${require('discord.js').version}`
                };
                
                // Create embed
                const embed = new EmbedBuilder()
                    .setColor('#7289DA')
                    .setTitle(t.get('dashboard.stats.page_title', { defaultValue: 'Bot Statistics' }))
                    .setThumbnail(interaction.client.user.displayAvatarURL())
                    .addFields(
                        { name: t.get('dashboard.stats.bot_info', { defaultValue: '🤖 Bot Info' }), value: 
                            t.get('dashboard.stats.bot_name', { defaultValue: `**Name:** ${interaction.client.user.username}`, botName: interaction.client.user.username }) + '\n' +
                            t.get('dashboard.stats.bot_id', { defaultValue: `**ID:** ${interaction.client.user.id}`, botId: interaction.client.user.id }) + '\n' +
                            t.get('dashboard.stats.bot_created', { defaultValue: `**Created:** <t:${Math.floor(interaction.client.user.createdTimestamp / 1000)}:R>`, timestamp: Math.floor(interaction.client.user.createdTimestamp / 1000) }) + '\n' +
                            t.get('dashboard.stats.bot_uptime', { defaultValue: `**Uptime:** ${uptime}`, uptime: uptime }), inline: false },
                        
                        { name: t.get('dashboard.stats.stats_title', { defaultValue: '📊 Stats' }), value: 
                            t.get('dashboard.stats.servers', { defaultValue: `**Servers:** ${interaction.client.guilds.cache.size.toLocaleString()}`, count: interaction.client.guilds.cache.size.toLocaleString() }) + '\n' +
                            t.get('dashboard.stats.users', { defaultValue: `**Users:** ${interaction.client.users.cache.size.toLocaleString()}`, count: interaction.client.users.cache.size.toLocaleString() }) + '\n' +
                            t.get('dashboard.stats.channels', { defaultValue: `**Channels:** ${interaction.client.channels.cache.size.toLocaleString()}`, count: interaction.client.channels.cache.size.toLocaleString() }) + '\n' +
                            t.get('dashboard.stats.commands_count', { defaultValue: `**Commands:** ${commandStats.total}`, count: commandStats.total }), inline: true },
                        
                        { name: t.get('dashboard.stats.categories_title', { defaultValue: '📁 Command Categories' }), value: 
                            Object.entries(commandStats.categories)
                                .map(([category, count]) => t.get('dashboard.stats.category_count', { 
                                    defaultValue: `**${category}:** ${count}`,
                                    category: category,
                                    count: count
                                }))
                                .join('\n'), inline: true },
                        
                        { name: t.get('dashboard.stats.system_title', { defaultValue: '💻 System' }), value: 
                            t.get('dashboard.stats.os', { defaultValue: `**OS:** ${systemInfo.os}`, os: systemInfo.os }) + '\n' +
                            t.get('dashboard.stats.memory', { defaultValue: `**Memory:** ${systemInfo.memory.usage} used`, usage: systemInfo.memory.usage }) + '\n' +
                            t.get('dashboard.stats.nodejs', { defaultValue: `**Node.js:** ${systemInfo.nodejs}`, version: systemInfo.nodejs }) + '\n' +
                            t.get('dashboard.stats.discordjs', { defaultValue: `**Discord.js:** ${systemInfo.discordjs}`, version: systemInfo.discordjs }), inline: false }
                    )
                    .setFooter({ text: t.get('dashboard.footer', { defaultValue: 'Developed by AlphaDev' }), iconURL: interaction.client.user.displayAvatarURL() })
                    .setTimestamp();
                
                // Create a button to go back to the dashboard
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('dashboard_back')
                            .setLabel(t.get('dashboard.buttons.back', { defaultValue: 'Back to Dashboard' }))
                            .setEmoji('🏠')
                            .setStyle(ButtonStyle.Secondary)
                    );
                
                await interaction.update({ embeds: [embed], components: [row] });
            }
            return;
        }
        
        // Get commands for the selected category
        const commands = getCategoryCommands(category);
        
        // Create embed for the category
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle(t.get('dashboard.category.title', { 
                defaultValue: `${getCategoryEmoji(category)} ${getCategoryDisplayName(category)} Commands`,
                emoji: getCategoryEmoji(category),
                category: getCategoryDisplayName(category)
            }))
            .setDescription(t.get('dashboard.category.description', { 
                defaultValue: `Here are all the commands in the ${getCategoryDisplayName(category)} category.`,
                category: getCategoryDisplayName(category)
            }))
            .setFooter({ text: t.get('dashboard.footer', { defaultValue: 'Developed by AlphaDev' }), iconURL: interaction.client.user.displayAvatarURL() });
        
        // Add commands to the embed
        if (commands.length === 0) {
            embed.addFields({ 
                name: t.get('dashboard.category.no_commands_title', { defaultValue: 'No Commands' }), 
                value: t.get('dashboard.category.no_commands_value', { defaultValue: 'This category has no commands.' }) 
            });
        } else {
            // Group commands by their base name (for commands with subcommands)
            const groupedCommands = {};
            
            commands.forEach(command => {
                const baseName = command.name.split('-')[0];
                
                if (!groupedCommands[baseName]) {
                    groupedCommands[baseName] = [];
                }
                
                groupedCommands[baseName].push(command);
            });
            
            // Add each command group to the embed
            Object.entries(groupedCommands).forEach(([baseName, cmds]) => {
                if (cmds.length === 1) {
                    // Single command
                    const command = cmds[0];
                    embed.addFields({ 
                        name: `/${command.name}`, 
                        value: command.description 
                    });
                } else {
                    // Command group (likely with subcommands)
                    const commandNames = cmds.map(cmd => `\`/${cmd.name}\``).join(', ');
                    embed.addFields({ 
                        name: t.get('dashboard.category.command_group', { 
                            defaultValue: `${cmds[0].name.split('-')[0]} Commands`,
                            group: cmds[0].name.split('-')[0]
                        }), 
                        value: commandNames 
                    });
                }
            });
        }
        
        // Create a button to go back to the dashboard
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dashboard_back')
                    .setLabel(t.get('dashboard.buttons.back', { defaultValue: 'Back to Dashboard' }))
                    .setEmoji('🏠')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        await interaction.update({ embeds: [embed], components: [row] });
    }
};

function getCommandStats() {
    const commandsDir = path.join(__dirname, '..');
    const categories = fs.readdirSync(commandsDir);
    
    const stats = {
        total: 0,
        categories: {}
    };
    
    categories.forEach(category => {
        const categoryPath = path.join(commandsDir, category);
        
        // Skip if not a directory
        if (!fs.statSync(categoryPath).isDirectory()) {
            return;
        }
        
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
        const count = commandFiles.length;
        
        stats.total += count;
        stats.categories[getCategoryDisplayName(category)] = count;
    });
    
    return stats;
}

function getCategoryCommands(categoryId) {
    // Map dashboard category to directory name
    const categoryMap = {
        'games': 'games',
        'welcome': 'welcome',
        'giveaways': 'giveaways',
        'tickets': 'tickets',
        'moderation': 'moderation',
        'utility': 'utility'
    };
    
    const dirName = categoryMap[categoryId] || categoryId;
    const categoryPath = path.join(__dirname, '..', dirName);
    
    // Check if directory exists
    if (!fs.existsSync(categoryPath) || !fs.statSync(categoryPath).isDirectory()) {
        return [];
    }
    
    const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    const commands = [];
    
    commandFiles.forEach(file => {
        try {
            const command = require(path.join(categoryPath, file));
            if (command.data && command.data.name) {
                commands.push({
                    name: command.data.name,
                    description: command.data.description
                });
            }
        } catch (error) {
            console.error(`Error loading command ${file}:`, error);
        }
    });
    
    return commands;
}

function getCategoryDisplayName(category) {
    const displayNames = {
        'games': 'Games',
        'welcome': 'Welcome System',
        'giveaways': 'Giveaways',
        'tickets': 'Ticket System',
        'moderation': 'Moderation',
        'utility': 'Utility',
        'back': 'Dashboard'
    };
    
    return displayNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function getCategoryEmoji(category) {
    const emojis = {
        'games': '🎮',
        'welcome': '👋',
        'giveaways': '🎁',
        'tickets': '🎫',
        'moderation': '🛡️',
        'utility': '⚙️',
        'back': '🏠'
    };
    
    return emojis[category] || '📁';
}

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    return `${days}d ${hours % 24}h ${minutes % 60}m ${seconds % 60}s`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}