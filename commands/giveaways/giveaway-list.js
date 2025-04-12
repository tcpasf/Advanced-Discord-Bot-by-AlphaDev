const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { giveaways } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-list')
        .setDescription('List all active giveaways')
        .addBooleanOption(option => 
            option.setName('include-ended')
                .setDescription('Whether to include ended giveaways')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const includeEnded = interaction.options.getBoolean('include-ended') || false;
        
        try {
            // Get all giveaways for this guild
            const allGiveaways = giveaways.getGiveawaysByGuildId(interaction.guild.id);
            
            // Filter giveaways based on includeEnded option
            const filteredGiveaways = includeEnded 
                ? allGiveaways 
                : allGiveaways.filter(g => !g.ended);
            
            if (filteredGiveaways.length === 0) {
                return interaction.reply({ 
                    embeds: [createInfoEmbed(
                        'No Giveaways',
                        includeEnded 
                            ? 'There are no giveaways in this server.'
                            : 'There are no active giveaways in this server.'
                    )],
                    ephemeral: true
                });
            }
            
            // Sort giveaways by end time (active first, then most recent ended)
            filteredGiveaways.sort((a, b) => {
                if (a.ended && !b.ended) return 1;
                if (!a.ended && b.ended) return -1;
                return b.endTime - a.endTime;
            });
            
            // Create embed
            const embed = createInfoEmbed(
                'Giveaways List',
                `${filteredGiveaways.length} giveaway${filteredGiveaways.length === 1 ? '' : 's'} found.`
            );
            
            // Add active giveaways
            const activeGiveaways = filteredGiveaways.filter(g => !g.ended);
            if (activeGiveaways.length > 0) {
                let activeText = '';
                
                for (const giveaway of activeGiveaways) {
                    activeText += `**Prize:** ${giveaway.prize}\n`;
                    activeText += `**Ends:** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n`;
                    activeText += `**Winners:** ${giveaway.winnerCount}\n`;
                    activeText += `**Entries:** ${giveaway.participants.length}\n`;
                    activeText += `**Message ID:** ${giveaway.messageId}\n\n`;
                }
                
                embed.addFields({ name: '🟢 Active Giveaways', value: activeText });
            }
            
            // Add ended giveaways if requested
            if (includeEnded) {
                const endedGiveaways = filteredGiveaways.filter(g => g.ended);
                
                if (endedGiveaways.length > 0) {
                    let endedText = '';
                    
                    // Limit to 5 most recent ended giveaways to avoid embed size limits
                    const recentEndedGiveaways = endedGiveaways.slice(0, 5);
                    
                    for (const giveaway of recentEndedGiveaways) {
                        endedText += `**Prize:** ${giveaway.prize}\n`;
                        endedText += `**Ended:** <t:${Math.floor(giveaway.endTime / 1000)}:R>\n`;
                        endedText += `**Winners:** ${giveaway.winnerCount}\n`;
                        endedText += `**Entries:** ${giveaway.participants.length}\n`;
                        endedText += `**Message ID:** ${giveaway.messageId}\n\n`;
                    }
                    
                    if (endedGiveaways.length > 5) {
                        endedText += `*And ${endedGiveaways.length - 5} more ended giveaways...*`;
                    }
                    
                    embed.addFields({ name: '🔴 Ended Giveaways', value: endedText });
                }
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error listing giveaways:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while listing giveaways.')],
                ephemeral: true
            });
        }
    }
};