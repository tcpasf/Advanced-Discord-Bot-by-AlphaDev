const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { coins } = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily coins reward'),
    
    async execute(interaction) {
        try {
            const result = coins.claimDaily(interaction.user.id, interaction.guild.id);
            
            if (result.success) {
                const userData = coins.getBalance(interaction.user.id, interaction.guild.id);
                
                // Increment command usage stat
                userData.stats.commandsUsed = (userData.stats.commandsUsed || 0) + 1;
                coins.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#FFD700') // Gold color
                    .setTitle('Daily Reward Claimed!')
                    .setDescription(`You received **${result.amount.toLocaleString()} coins** as your daily reward!`)
                    .addFields(
                        { name: '💰 New Balance', value: `${result.balance.toLocaleString()} coins`, inline: true },
                        { name: '🏦 Bank Balance', value: `${userData.bank.toLocaleString()} coins`, inline: true },
                        { name: '💵 Total', value: `${(userData.balance + userData.bank).toLocaleString()} coins`, inline: true }
                    )
                    .setFooter({ text: 'Come back tomorrow for another reward!' })
                    .setTimestamp();
                
                // Add a streak system if the user claims daily rewards consistently
                const now = Date.now();
                if (!userData.dailyStreak) userData.dailyStreak = { count: 0, lastClaim: 0 };
                
                // Check if this is a consecutive day (within 26 hours of last claim)
                if (now - userData.dailyStreak.lastClaim < 93600000) { // 26 hours
                    userData.dailyStreak.count++;
                    
                    // Give bonus for streaks
                    if (userData.dailyStreak.count % 7 === 0) {
                        // Weekly streak bonus
                        const bonus = 250;
                        userData.balance += bonus;
                        embed.addFields({ 
                            name: '🔥 Weekly Streak Bonus!', 
                            value: `You've claimed daily rewards for **${userData.dailyStreak.count} days** in a row!\nBonus: **${bonus.toLocaleString()} coins**` 
                        });
                    } else {
                        embed.addFields({ 
                            name: '🔥 Daily Streak', 
                            value: `You've claimed daily rewards for **${userData.dailyStreak.count} days** in a row!` 
                        });
                    }
                } else {
                    // Reset streak
                    userData.dailyStreak.count = 1;
                    embed.addFields({ 
                        name: '🔥 Daily Streak', 
                        value: `You've started a new daily streak! Claim again tomorrow to continue.` 
                    });
                }
                
                userData.dailyStreak.lastClaim = now;
                coins.save();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                // Calculate time remaining
                const timeLeft = result.cooldown;
                const hours = Math.floor(timeLeft / 3600000);
                const minutes = Math.floor((timeLeft % 3600000) / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                
                const embed = createErrorEmbed(
                    'Daily Reward Not Available',
                    `You've already claimed your daily reward. Please wait **${hours}h ${minutes}m ${seconds}s** before claiming again.`
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while claiming your daily reward.')],
                ephemeral: true
            });
        }
    }
};