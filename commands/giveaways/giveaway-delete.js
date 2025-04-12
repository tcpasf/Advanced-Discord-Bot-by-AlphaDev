const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { giveaways } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-delete')
        .setDescription('Delete a giveaway')
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
            
            await interaction.deferReply();
            
            // Delete the giveaway message
            try {
                const channel = await interaction.guild.channels.fetch(giveaway.channelId);
                const message = await channel.messages.fetch(giveaway.messageId);
                await message.delete();
            } catch (error) {
                console.error('Error deleting giveaway message:', error);
                // Continue even if message deletion fails
            }
            
            // Delete the giveaway from the database
            giveaways.deleteGiveaway(giveaway.id);
            
            await interaction.editReply({ 
                embeds: [createSuccessEmbed(
                    'Giveaway Deleted',
                    `The giveaway for **${giveaway.prize}** has been deleted.`
                )]
            });
        } catch (error) {
            console.error('Error deleting giveaway:', error);
            
            if (interaction.deferred) {
                await interaction.editReply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while deleting the giveaway.')]
                });
            } else {
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while deleting the giveaway.')],
                    ephemeral: true
                });
            }
        }
    }
};