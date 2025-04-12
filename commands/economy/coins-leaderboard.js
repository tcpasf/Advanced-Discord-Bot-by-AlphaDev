const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { coins } = require('../../utils/database');
const { createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the coins leaderboard')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('The type of leaderboard to view')
                .setRequired(false)
                .addChoices(
                    { name: 'Wallet Balance', value: 'balance' },
                    { name: 'Bank Balance', value: 'bank' },
                    { name: 'Total Balance', value: 'total' }
                ))
        .addIntegerOption(option => 
            option.setName('limit')
                .setDescription('The number of users to show (1-25)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const type = interaction.options.getString('type') || 'total';
            const limit = interaction.options.getInteger('limit') || 10;
            
            const leaderboard = coins.getLeaderboard(interaction.guild.id, type, limit);
            
            if (leaderboard.length === 0) {
                return interaction.editReply({ 
                    embeds: [createErrorEmbed('No Data', 'There are no users with coins in this server yet.')]
                });
            }
            
            // Fetch user data for display
            const leaderboardPromises = leaderboard.map(async (entry, index) => {
                try {
                    const user = await interaction.client.users.fetch(entry.userId);
                    return {
                        ...entry,
                        username: user.username,
                        position: index + 1
                    };
                } catch (error) {
                    return {
                        ...entry,
                        username: 'Unknown User',
                        position: index + 1
                    };
                }
            });
            
            const resolvedLeaderboard = await Promise.all(leaderboardPromises);
            
            // Create the embed
            const typeNames = {
                'balance': 'Wallet Balance',
                'bank': 'Bank Balance',
                'total': 'Total Balance'
            };
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700') // Gold color
                .setTitle(`${interaction.guild.name} Coins Leaderboard`)
                .setDescription(`Top ${limit} users by ${typeNames[type]}`)
                .setFooter({ text: `Economy System • ${new Date().toLocaleDateString()}` })
                .setTimestamp();
            
            // Add leaderboard entries
            let description = '';
            
            resolvedLeaderboard.forEach(entry => {
                let value;
                if (type === 'balance') {
                    value = entry.balance;
                } else if (type === 'bank') {
                    value = entry.bank;
                } else {
                    value = (entry.balance || 0) + (entry.bank || 0);
                }
                
                // Add medal emoji for top 3
                let prefix = `${entry.position}. `;
                if (entry.position === 1) prefix = '🥇 ';
                else if (entry.position === 2) prefix = '🥈 ';
                else if (entry.position === 3) prefix = '🥉 ';
                
                description += `${prefix}**${entry.username}**: ${value.toLocaleString()} coins\n`;
            });
            
            embed.setDescription(description);
            
            // Find the requesting user's position if not in the top
            const requestingUserData = coins.getBalance(interaction.user.id, interaction.guild.id);
            const requestingUserValue = type === 'balance' ? requestingUserData.balance : 
                                       type === 'bank' ? requestingUserData.bank : 
                                       (requestingUserData.balance + requestingUserData.bank);
            
            // Check if the user is not in the displayed leaderboard
            const userInTop = resolvedLeaderboard.some(entry => entry.userId === interaction.user.id);
            
            if (!userInTop && requestingUserValue > 0) {
                // Get all users for this guild
                const allUsers = Object.entries(coins.get().users[interaction.guild.id] || {}).map(([userId, data]) => ({
                    userId,
                    ...data
                }));
                
                // Sort them by the appropriate value
                let sortedUsers;
                if (type === 'balance') {
                    sortedUsers = allUsers.sort((a, b) => b.balance - a.balance);
                } else if (type === 'bank') {
                    sortedUsers = allUsers.sort((a, b) => b.bank - a.bank);
                } else {
                    sortedUsers = allUsers.sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank));
                }
                
                // Find the user's position
                const userPosition = sortedUsers.findIndex(user => user.userId === interaction.user.id) + 1;
                
                if (userPosition > 0) {
                    embed.addFields({ 
                        name: 'Your Position', 
                        value: `You are #${userPosition} with ${requestingUserValue.toLocaleString()} coins` 
                    });
                }
            }
            
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error displaying leaderboard:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while displaying the leaderboard.')]
                });
            } else {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while displaying the leaderboard.')],
                    ephemeral: true
                });
            }
        }
    }
};