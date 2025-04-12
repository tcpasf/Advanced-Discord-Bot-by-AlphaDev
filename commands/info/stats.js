const { SlashCommandBuilder, EmbedBuilder, version } = require('discord.js');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Display bot statistics and information'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        // Get command statistics
        const commandStats = getCommandStats();
        
        // Calculate uptime
        const uptime = formatUptime(interaction.client.uptime);
        
        // Get system information
        const systemInfo = {
            os: `${os.type()} ${os.release()}`,
            cpu: os.cpus()[0].model,
            memory: {
                total: formatBytes(os.totalmem()),
                free: formatBytes(os.freemem()),
                usage: `${Math.round((os.totalmem() - os.freemem()) / os.totalmem() * 100)}%`
            },
            nodejs: process.version,
            discordjs: `v${version}`
        };
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('Bot Statistics')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: '🤖 Bot Info', value: 
                    `**Name:** ${interaction.client.user.username}\n` +
                    `**ID:** ${interaction.client.user.id}\n` +
                    `**Created:** <t:${Math.floor(interaction.client.user.createdTimestamp / 1000)}:R>\n` +
                    `**Uptime:** ${uptime}`, inline: false },
                
                { name: '📊 Stats', value: 
                    `**Servers:** ${interaction.client.guilds.cache.size.toLocaleString()}\n` +
                    `**Users:** ${interaction.client.users.cache.size.toLocaleString()}\n` +
                    `**Channels:** ${interaction.client.channels.cache.size.toLocaleString()}\n` +
                    `**Commands:** ${commandStats.total}`, inline: true },
                
                { name: '📁 Command Categories', value: 
                    Object.entries(commandStats.categories)
                        .map(([category, count]) => `**${category}:** ${count}`)
                        .join('\n'), inline: true },
                
                { name: '💻 System', value: 
                    `**OS:** ${systemInfo.os}\n` +
                    `**Memory:** ${systemInfo.memory.usage} used\n` +
                    `**Node.js:** ${systemInfo.nodejs}\n` +
                    `**Discord.js:** ${systemInfo.discordjs}`, inline: false }
            )
            .setFooter({ text: 'Developed by AlphaDev', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
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