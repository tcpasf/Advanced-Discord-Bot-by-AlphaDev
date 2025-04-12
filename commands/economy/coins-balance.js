const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { coins } = require('../../utils/database');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your coin balance or another user\'s balance')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check the balance of (defaults to you)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const userData = coins.getBalance(targetUser.id, interaction.guild.id);
            
            // Increment command usage stat
            userData.stats.commandsUsed = (userData.stats.commandsUsed || 0) + 1;
            coins.save();
            
            const totalBalance = userData.balance + userData.bank;
            
            const embed = new EmbedBuilder()
                .setColor('#FFD700') // Gold color
                .setTitle(`${targetUser.id === interaction.user.id ? 'Your' : `${targetUser.username}'s`} Balance`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '💰 Wallet', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                    { name: '🏦 Bank', value: `${userData.bank.toLocaleString()} coins`, inline: true },
                    { name: '💵 Total', value: `${totalBalance.toLocaleString()} coins`, inline: true }
                )
                .setFooter({ text: 'Economy System' })
                .setTimestamp();
            
            // Add stats if user is checking their own balance
            if (targetUser.id === interaction.user.id) {
                embed.addFields(
                    { name: '📊 Statistics', value: `Total Earned: ${userData.stats.totalEarned.toLocaleString()} coins\nTotal Spent: ${userData.stats.totalSpent.toLocaleString()} coins` }
                );
                
                // Add cooldown information
                const now = Date.now();
                const settings = coins.getSettings();
                
                const dailyReady = !userData.lastDaily || now - userData.lastDaily >= settings.dailyCooldown;
                const weeklyReady = !userData.lastWeekly || now - userData.lastWeekly >= settings.weeklyCooldown;
                const workReady = !userData.lastWork || now - userData.lastWork >= settings.workCooldown;
                
                let cooldownInfo = '';
                
                if (dailyReady) {
                    cooldownInfo += '✅ Daily reward is available! Use `/daily`\n';
                } else {
                    const timeLeft = userData.lastDaily + settings.dailyCooldown - now;
                    const hoursLeft = Math.floor(timeLeft / 3600000);
                    const minutesLeft = Math.floor((timeLeft % 3600000) / 60000);
                    cooldownInfo += `⏳ Daily reward available in ${hoursLeft}h ${minutesLeft}m\n`;
                }
                
                if (weeklyReady) {
                    cooldownInfo += '✅ Weekly reward is available! Use `/weekly`\n';
                } else {
                    const timeLeft = userData.lastWeekly + settings.weeklyCooldown - now;
                    const daysLeft = Math.floor(timeLeft / 86400000);
                    const hoursLeft = Math.floor((timeLeft % 86400000) / 3600000);
                    cooldownInfo += `⏳ Weekly reward available in ${daysLeft}d ${hoursLeft}h\n`;
                }
                
                if (workReady) {
                    cooldownInfo += '✅ Work is available! Use `/work`';
                } else {
                    const timeLeft = userData.lastWork + settings.workCooldown - now;
                    const minutesLeft = Math.floor(timeLeft / 60000);
                    const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
                    cooldownInfo += `⏳ Work available in ${minutesLeft}m ${secondsLeft}s`;
                }
                
                embed.addFields({ name: '⏱️ Cooldowns', value: cooldownInfo });
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error checking balance:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while checking the balance.')],
                ephemeral: true
            });
        }
    }
};