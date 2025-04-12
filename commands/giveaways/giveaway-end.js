const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { giveaways } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-end')
        .setDescription('End a giveaway early')
        .addStringOption(option => 
            option.setName('message-id')
                .setDescription('The message ID of the giveaway')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const messageId = interaction.options.getString('message-id');
        
        try {
            // Get giveaway data
            const giveaway = giveaways.getGiveawayByMessageId(messageId);
            
            if (!giveaway) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Giveaway Not Found', 'No giveaway found with that message ID.')],
                    ephemeral: true
                });
            }
            
            if (giveaway.ended) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Giveaway Already Ended', 'This giveaway has already ended.')],
                    ephemeral: true
                });
            }
            
            await interaction.deferReply();
            
            // End the giveaway
            await endGiveaway(interaction.client, giveaway);
            
            await interaction.editReply({ 
                embeds: [createSuccessEmbed('Giveaway Ended', `The giveaway for **${giveaway.prize}** has been ended.`)]
            });
        } catch (error) {
            console.error('Error ending giveaway:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while ending the giveaway.')]
                });
            } else {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while ending the giveaway.')],
                    ephemeral: true
                });
            }
        }
    }
};

async function endGiveaway(client, giveaway) {
    try {
        // Mark giveaway as ended
        giveaway.ended = true;
        giveaways.updateGiveaway(giveaway);
        
        // Get channel and message
        const guild = await client.guilds.fetch(giveaway.guildId);
        const channel = await guild.channels.fetch(giveaway.channelId);
        const message = await channel.messages.fetch(giveaway.messageId);
        
        // Select winners
        const winners = [];
        const participants = [...giveaway.participants]; // Create a copy
        
        if (participants.length === 0) {
            // No participants
            const noWinnersEmbed = createErrorEmbed(
                '🎉 GIVEAWAY ENDED 🎉',
                `**Prize:** ${giveaway.prize}\n\nNo one entered the giveaway.`
            )
            .setColor('#FF0000');
            
            await message.edit({ embeds: [noWinnersEmbed], components: [] });
            
            await channel.send({ 
                embeds: [createErrorEmbed('Giveaway Ended', `No one entered the giveaway for **${giveaway.prize}**.`)]
            });
            
            return;
        }
        
        // Select winners randomly
        const winnerCount = Math.min(giveaway.winnerCount, participants.length);
        
        for (let i = 0; i < winnerCount; i++) {
            const randomIndex = Math.floor(Math.random() * participants.length);
            const winnerId = participants[randomIndex];
            
            winners.push(winnerId);
            participants.splice(randomIndex, 1);
        }
        
        // Update giveaway message
        const winnersList = winners.map(id => `<@${id}>`).join(', ');
        
        const endedEmbed = createSuccessEmbed(
            '🎉 GIVEAWAY ENDED 🎉',
            `**Prize:** ${giveaway.prize}`
        )
        .setColor('#00FF00')
        .addFields(
            { name: 'Winners', value: winnersList, inline: false },
            { name: 'Hosted By', value: `<@${giveaway.hostId}>`, inline: true },
            { name: 'Entries', value: `${giveaway.participants.length}`, inline: true },
            { name: 'Ended', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        );
        
        if (giveaway.description) {
            endedEmbed.setDescription(`${giveaway.description}\n\n**Prize:** ${giveaway.prize}`);
        }
        
        await message.edit({ embeds: [endedEmbed], components: [] });
        
        // Send winner announcement
        const winnerEmbed = createSuccessEmbed(
            '🎉 Giveaway Winners 🎉',
            `Congratulations to the winners of the **${giveaway.prize}** giveaway!`
        )
        .addFields({ name: 'Winners', value: winnersList });
        
        await channel.send({ 
            content: `Congratulations ${winnersList}! You won the giveaway for **${giveaway.prize}**!`,
            embeds: [winnerEmbed]
        });
    } catch (error) {
        console.error('Error ending giveaway:', error);
        throw error;
    }
}