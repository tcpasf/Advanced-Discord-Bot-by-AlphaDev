const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { coins } = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bank')
        .setDescription('Manage your bank account')
        .addSubcommand(subcommand =>
            subcommand
                .setName('deposit')
                .setDescription('Deposit coins into your bank account')
                .addIntegerOption(option => 
                    option.setName('amount')
                        .setDescription('The amount of coins to deposit')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('withdraw')
                .setDescription('Withdraw coins from your bank account')
                .addIntegerOption(option => 
                    option.setName('amount')
                        .setDescription('The amount of coins to withdraw')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Check your bank balance')),
    
    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();
            const userData = coins.getBalance(interaction.user.id, interaction.guild.id);
            
            // Increment command usage stat
            userData.stats.commandsUsed = (userData.stats.commandsUsed || 0) + 1;
            coins.save();
            
            if (subcommand === 'deposit') {
                const amount = interaction.options.getInteger('amount');
                
                // Check if user has enough coins
                if (userData.balance < amount) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Insufficient Funds', `You don't have enough coins in your wallet. You have ${userData.balance.toLocaleString()} coins.`)],
                        ephemeral: true
                    });
                }
                
                // Deposit coins
                const result = coins.deposit(interaction.user.id, interaction.guild.id, amount);
                
                if (result) {
                    const embed = new EmbedBuilder()
                        .setColor('#4CAF50') // Green color
                        .setTitle('Deposit Successful')
                        .setDescription(`You deposited **${amount.toLocaleString()} coins** into your bank account.`)
                        .addFields(
                            { name: '💰 Wallet Balance', value: `${result.balance.toLocaleString()} coins`, inline: true },
                            { name: '🏦 Bank Balance', value: `${result.bank.toLocaleString()} coins`, inline: true },
                            { name: '💵 Total', value: `${(result.balance + result.bank).toLocaleString()} coins`, inline: true }
                        )
                        .setFooter({ text: 'Your coins are now safe in the bank!' })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('Deposit Failed', 'An error occurred while depositing your coins.')],
                        ephemeral: true
                    });
                }
            } else if (subcommand === 'withdraw') {
                const amount = interaction.options.getInteger('amount');
                
                // Check if user has enough coins in bank
                if (userData.bank < amount) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Insufficient Funds', `You don't have enough coins in your bank. You have ${userData.bank.toLocaleString()} coins in your bank.`)],
                        ephemeral: true
                    });
                }
                
                // Withdraw coins
                const result = coins.withdraw(interaction.user.id, interaction.guild.id, amount);
                
                if (result) {
                    const embed = new EmbedBuilder()
                        .setColor('#4CAF50') // Green color
                        .setTitle('Withdrawal Successful')
                        .setDescription(`You withdrew **${amount.toLocaleString()} coins** from your bank account.`)
                        .addFields(
                            { name: '💰 Wallet Balance', value: `${result.balance.toLocaleString()} coins`, inline: true },
                            { name: '🏦 Bank Balance', value: `${result.bank.toLocaleString()} coins`, inline: true },
                            { name: '💵 Total', value: `${(result.balance + result.bank).toLocaleString()} coins`, inline: true }
                        )
                        .setFooter({ text: 'Your coins are now in your wallet!' })
                        .setTimestamp();
                    
                    await interaction.reply({ embeds: [embed] });
                } else {
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('Withdrawal Failed', 'An error occurred while withdrawing your coins.')],
                        ephemeral: true
                    });
                }
            } else if (subcommand === 'balance') {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700') // Gold color
                    .setTitle('Bank Account')
                    .setDescription(`Here's your bank account information, ${interaction.user.username}.`)
                    .addFields(
                        { name: '💰 Wallet Balance', value: `${userData.balance.toLocaleString()} coins`, inline: true },
                        { name: '🏦 Bank Balance', value: `${userData.bank.toLocaleString()} coins`, inline: true },
                        { name: '💵 Total', value: `${(userData.balance + userData.bank).toLocaleString()} coins`, inline: true }
                    )
                    .setFooter({ text: 'Bank accounts keep your coins safe!' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error with bank command:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while processing your bank transaction.')],
                ephemeral: true
            });
        }
    }
};