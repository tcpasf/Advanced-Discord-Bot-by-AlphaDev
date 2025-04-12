const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { coins } = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weekly')
        .setDescription('Claim your weekly coins reward'),
    
    async execute(interaction) {
        try {
            const result = coins.claimWeekly(interaction.user.id, interaction.guild.id);
            
            if (result.success) {
                const userData = coins.getBalance(interaction.user.id, interaction.guild.id);
                
                // Increment command usage stat
                userData.stats.commandsUsed = (userData.stats.commandsUsed || 0) + 1;
                coins.save();
                
                const embed = new EmbedBuilder()
                    .setColor('#FFD700') // Gold color
                    .setTitle('Weekly Reward Claimed!')
                    .setDescription(`You received **${result.amount.toLocaleString()} coins** as your weekly reward!`)
                    .addFields(
                        { name: '💰 New Balance', value: `${result.balance.toLocaleString()} coins`, inline: true },
                        { name: '🏦 Bank Balance', value: `${userData.bank.toLocaleString()} coins`, inline: true },
                        { name: '💵 Total', value: `${(userData.balance + userData.bank).toLocaleString()} coins`, inline: true }
                    )
                    .setFooter({ text: 'Come back next week for another reward!' })
                    .setTimestamp();
                
                // Add a streak system if the user claims weekly rewards consistently
                const now = Date.now();
                if (!userData.weeklyStreak) userData.weeklyStreak = { count: 0, lastClaim: 0 };
                
                // Check if this is a consecutive week (within 8 days of last claim)
                if (now - userData.weeklyStreak.lastClaim < 691200000) { // 8 days
                    userData.weeklyStreak.count++;
                    
                    // Give bonus for streaks
                    if (userData.weeklyStreak.count % 4 === 0) {
                        // Monthly streak bonus
                        const bonus = 1000;
                        userData.balance += bonus;
                        embed.addFields({ 
                            name: '🔥 Monthly Streak Bonus!', 
                            value: `You've claimed weekly rewards for **${userData.weeklyStreak.count} weeks** in a row!\nBonus: **${bonus.toLocaleString()} coins**` 
                        });
                    } else {
                        embed.addFields({ 
                            name: '🔥 Weekly Streak', 
                            value: `You've claimed weekly rewards for **${userData.weeklyStreak.count} weeks** in a row!` 
                        });
                    }
                } else {
                    // Reset streak
                    userData.weeklyStreak.count = 1;
                    embed.addFields({ 
                        name: '🔥 Weekly Streak', 
                        value: `You've started a new weekly streak! Claim again next week to continue.` 
                    });
                }
                
                userData.weeklyStreak.lastClaim = now;
                coins.save();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                // Calculate time remaining
                const timeLeft = result.cooldown;
                const days = Math.floor(timeLeft / 86400000);
                const hours = Math.floor((timeLeft % 86400000) / 3600000);
                const minutes = Math.floor((timeLeft % 3600000) / 60000);
                
                const embed = createErrorEmbed(
                    'Weekly Reward Not Available',
                    `You've already claimed your weekly reward. Please wait **${days}d ${hours}h ${minutes}m** before claiming again.`
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Error claiming weekly reward:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while claiming your weekly reward.')],
                ephemeral: true
            });
        }
    }
};