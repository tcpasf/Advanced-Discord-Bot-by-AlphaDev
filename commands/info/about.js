const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('about')
        .setDescription('Display information about the bot'),
    
    async execute(interaction) {
        // Get command count
        const commandCount = getCommandCount();
        
        // Create embed
        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle(`About ${interaction.client.user.username}`)
            .setDescription(`${interaction.client.user.username} is a versatile Discord bot designed to enhance your server with moderation, games, welcome messages, giveaways, and more!`)
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields(
                { name: '🤖 Bot Information', value: 
                    `**Commands:** ${commandCount.total}\n` +
                    `**Categories:** ${Object.keys(commandCount.categories).length}\n` +
                    `**Created:** <t:${Math.floor(interaction.client.user.createdTimestamp / 1000)}:R>`, inline: false },
                
                { name: '🌟 Key Features', value: 
                    '• Advanced moderation tools\n' +
                    '• Interactive games\n' +
                    '• Customizable welcome system\n' +
                    '• Giveaway management\n' +
                    '• Ticket system\n' +
                    '• Utility commands', inline: false },
                
                { name: '👨‍💻 Developer', value: 'AlphaDev', inline: true },
                { name: '📅 Version', value: '1.0.0', inline: true },
                { name: '⚙️ Framework', value: 'Discord.js', inline: true }
            )
            .setFooter({ text: 'Thank you for using our bot!', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();
        
        // Create buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('commands_home')
                    .setLabel('Commands Menu')
                    .setEmoji('❓')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dashboard_back')
                    .setLabel('Dashboard')
                    .setEmoji('📊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('about_stats')
                    .setLabel('Bot Stats')
                    .setEmoji('📈')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setLabel('Support Server')
                    .setEmoji('🔗')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.gg/alphadev')
            );
        
        await interaction.reply({ embeds: [embed], components: [row] });
    },
    
    async handleButton(interaction) {
        if (interaction.customId === 'about_stats') {
            // Redirect to stats command
            const statsCommand = interaction.client.commands.get('stats');
            if (statsCommand) {
                await interaction.deferUpdate();
                await statsCommand.execute(interaction);
            }
        }
    }
};

function getCommandCount() {
    const commandsDir = path.join(__dirname, '..');
    const categories = fs.readdirSync(commandsDir);
    
    const counts = {
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
        
        counts.total += count;
        counts.categories[category] = count;
    });
    
    return counts;
}