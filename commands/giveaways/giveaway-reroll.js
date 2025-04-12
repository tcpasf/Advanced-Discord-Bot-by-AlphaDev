const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { giveaways } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-reroll')
        .setDescription('Reroll a giveaway to select new winners')
        .addStringOption(option => 
            option.setName('message-id')
                .setDescription('The message ID of the giveaway')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('winners')
                .setDescription('The number of winners to reroll (defaults to all)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const messageId = interaction.options.getString('message-id');
        const winnerCount = interaction.options.getInteger('winners');
        
        try {
            // Get giveaway data
            const giveaway = giveaways.getGiveawayByMessageId(messageId);
            
            if (!giveaway) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Giveaway Not Found', 'No giveaway found with that message ID.')],
                    ephemeral: true
                });
            }
            
            if (!giveaway.ended) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Giveaway Not Ended', 'This giveaway has not ended yet.')],
                    ephemeral: true
                });
            }
            
            if (giveaway.participants.length === 0) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('No Participants', 'This giveaway had no participants.')],
                    ephemeral: true
                });
            }
            
            await interaction.deferReply();
            
            // Reroll the giveaway
            const newWinners = await rerollGiveaway(
                interaction.client, 
                giveaway, 
                winnerCount || giveaway.winnerCount
            );
            
            if (newWinners.length === 0) {
                await interaction.editReply({ 
                    embeds: [createErrorEmbed('Reroll Failed', 'Could not select new winners. There may not be enough participants.')]
                });
                return;
            }
            
            const winnersList = newWinners.map(id => `<@${id}>`).join(', ');
            
            await interaction.editReply({ 
                embeds: [createSuccessEmbed(
                    'Giveaway Rerolled',
                    `The giveaway for **${giveaway.prize}** has been rerolled with new winners!`
                )
                .addFields({ name: 'New Winners', value: winnersList })]
            });
        } catch (error) {
            console.error('Error rerolling giveaway:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while rerolling the giveaway.')]
                });
            } else {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while rerolling the giveaway.')],
                    ephemeral: true
                });
            }
        }
    }
};

async function rerollGiveaway(client, giveaway, winnerCount) {
    try {
        // Get channel
        const guild = await client.guilds.fetch(giveaway.guildId);
        const channel = await guild.channels.fetch(giveaway.channelId);
        
        // Select new winners
        const newWinners = [];
        const participants = [...giveaway.participants]; // Create a copy
        
        if (participants.length === 0) {
            return [];
        }
        
        // Select winners randomly
        const actualWinnerCount = Math.min(winnerCount, participants.length);
        
        for (let i = 0; i < actualWinnerCount; i++) {
            const randomIndex = Math.floor(Math.random() * participants.length);
            const winnerId = participants[randomIndex];
            
            newWinners.push(winnerId);
            participants.splice(randomIndex, 1);
        }
        
        if (newWinners.length === 0) {
            return [];
        }
        
        // Send winner announcement
        const winnersList = newWinners.map(id => `<@${id}>`).join(', ');
        
        const winnerEmbed = createSuccessEmbed(
            '🎉 Giveaway Rerolled 🎉',
            `New winners have been selected for the **${giveaway.prize}** giveaway!`
        )
        .addFields({ name: 'New Winners', value: winnersList });
        
        await channel.send({ 
            content: `Congratulations ${winnersList}! You won the reroll for **${giveaway.prize}**!`,
            embeds: [winnerEmbed]
        });
        
        return newWinners;
    } catch (error) {
        console.error('Error rerolling giveaway:', error);
        throw error;
    }
}