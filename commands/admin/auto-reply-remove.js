const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { autoReplies } = require('../../utils/database');
const { translate } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-reply-remove')
        .setDescription('Remove an auto-reply')
        .addStringOption(option => 
            option.setName('id')
                .setDescription('The ID of the auto-reply to remove')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const replyId = interaction.options.getString('id');
            
            // Get the existing auto-reply for confirmation message
            const existingReply = autoReplies.getReply(guildId, replyId);
            
            if (!existingReply) {
                return interaction.reply({
                    embeds: [createErrorEmbed(
                        'Auto-Reply Not Found',
                        `No auto-reply found with ID: \`${replyId}\``
                    )],
                    ephemeral: true
                });
            }
            
            // Remove the auto-reply
            const success = autoReplies.removeReply(guildId, replyId);
            
            if (success) {
                // Create success embed
                const embed = createSuccessEmbed(
                    'Auto-Reply Removed',
                    `Auto-reply with ID \`${replyId}\` has been removed.`
                );
                
                // Add details about the removed auto-reply
                embed.addFields(
                    { name: 'Trigger', value: existingReply.trigger, inline: true },
                    { name: 'Match Type', value: existingReply.matchType, inline: true },
                    { name: 'Use Count', value: `${existingReply.useCount}`, inline: true }
                );
                
                await interaction.reply({ embeds: [embed] });
            } else {
                await interaction.reply({
                    embeds: [createErrorEmbed(
                        'Removal Failed',
                        'Failed to remove the auto-reply. Please try again.'
                    )],
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error removing auto-reply:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed(
                    translate('common.error', interaction.guild.id), 
                    'There was an error removing the auto-reply. Please try again.'
                )],
                ephemeral: true
            });
        }
    },
    
    async autocomplete(interaction) {
        const guildId = interaction.guild.id;
        const focusedValue = interaction.options.getFocused();
        const replies = autoReplies.getGuildReplies(guildId);
        
        const filtered = replies
            .filter(reply => 
                reply.id.includes(focusedValue) || 
                reply.trigger.toLowerCase().includes(focusedValue.toLowerCase())
            )
            .slice(0, 25); // Discord has a limit of 25 choices
        
        await interaction.respond(
            filtered.map(reply => ({
                name: `${reply.trigger.substring(0, 30)}${reply.trigger.length > 30 ? '...' : ''} (${reply.id})`,
                value: reply.id
            }))
        );
    }
};