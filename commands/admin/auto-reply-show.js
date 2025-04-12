const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { autoReplies } = require('../../utils/database');
const { translate } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-reply-show')
        .setDescription('Show auto-replies for this server')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all auto-replies')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('details')
                .setDescription('Show details of a specific auto-reply')
                .addStringOption(option => 
                    option.setName('id')
                        .setDescription('The ID of the auto-reply to show')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const subcommand = interaction.options.getSubcommand();
            
            if (subcommand === 'list') {
                const replies = autoReplies.getGuildReplies(guildId);
                
                if (replies.length === 0) {
                    return interaction.reply({
                        embeds: [createErrorEmbed(
                            'No Auto-Replies',
                            'There are no auto-replies set up for this server.'
                        )],
                        ephemeral: true
                    });
                }
                
                // Create pages of auto-replies (10 per page)
                const pages = [];
                for (let i = 0; i < replies.length; i += 10) {
                    const pageReplies = replies.slice(i, i + 10);
                    
                    const embed = new EmbedBuilder()
                        .setTitle(`Auto-Replies (${i+1}-${Math.min(i+10, replies.length)} of ${replies.length})`)
                        .setColor('#3498db')
                        .setDescription('Here are the auto-replies for this server:')
                        .setTimestamp();
                    
                    for (const reply of pageReplies) {
                        const status = reply.enabled ? '✅' : '❌';
                        const triggerPreview = reply.trigger.length > 30 
                            ? reply.trigger.substring(0, 27) + '...' 
                            : reply.trigger;
                        const responsePreview = reply.response.length > 30 
                            ? reply.response.substring(0, 27) + '...' 
                            : reply.response;
                        
                        embed.addFields({
                            name: `${status} ID: ${reply.id}`,
                            value: `**Trigger:** \`${triggerPreview}\`\n**Response:** \`${responsePreview}\`\n**Type:** ${reply.matchType}`,
                            inline: false
                        });
                    }
                    
                    pages.push(embed);
                }
                
                // For now, just show the first page
                // In a more advanced implementation, you could add pagination buttons
                await interaction.reply({ embeds: [pages[0]] });
                
            } else if (subcommand === 'details') {
                const replyId = interaction.options.getString('id');
                const reply = autoReplies.getReply(guildId, replyId);
                
                if (!reply) {
                    return interaction.reply({
                        embeds: [createErrorEmbed(
                            'Auto-Reply Not Found',
                            `No auto-reply found with ID: \`${replyId}\``
                        )],
                        ephemeral: true
                    });
                }
                
                // Create embed with detailed information
                const embed = new EmbedBuilder()
                    .setTitle(`Auto-Reply Details: ${reply.id}`)
                    .setColor('#3498db')
                    .setDescription(`**Trigger:** \`${reply.trigger}\`\n**Response:** \`${reply.response}\``)
                    .addFields(
                        { name: 'Status', value: reply.enabled ? 'Enabled ✅' : 'Disabled ❌', inline: true },
                        { name: 'Match Type', value: reply.matchType, inline: true },
                        { name: 'Case Sensitive', value: reply.caseSensitive ? 'Yes' : 'No', inline: true },
                        { name: 'Chance', value: `${reply.chance}%`, inline: true },
                        { name: 'Cooldown', value: `${reply.cooldown / 1000} seconds`, inline: true },
                        { name: 'Use Count', value: `${reply.useCount}`, inline: true },
                        { name: 'Delete Original', value: reply.deleteOriginal ? 'Yes' : 'No', inline: true },
                        { name: 'Reply in DM', value: reply.replyInDM ? 'Yes' : 'No', inline: true },
                        { name: 'Created', value: `<t:${Math.floor(reply.createdAt / 1000)}:R>`, inline: true }
                    )
                    .setTimestamp();
                
                // Add channel restrictions if any
                if (reply.allowedChannels && reply.allowedChannels.length > 0) {
                    embed.addFields({
                        name: 'Allowed Channels',
                        value: reply.allowedChannels.map(id => `<#${id}>`).join(', '),
                        inline: false
                    });
                }
                
                if (reply.excludedChannels && reply.excludedChannels.length > 0) {
                    embed.addFields({
                        name: 'Excluded Channels',
                        value: reply.excludedChannels.map(id => `<#${id}>`).join(', '),
                        inline: false
                    });
                }
                
                // Add role restrictions if any
                if (reply.allowedRoles && reply.allowedRoles.length > 0) {
                    embed.addFields({
                        name: 'Allowed Roles',
                        value: reply.allowedRoles.map(id => `<@&${id}>`).join(', '),
                        inline: false
                    });
                }
                
                if (reply.excludedRoles && reply.excludedRoles.length > 0) {
                    embed.addFields({
                        name: 'Excluded Roles',
                        value: reply.excludedRoles.map(id => `<@&${id}>`).join(', '),
                        inline: false
                    });
                }
                
                // Add last used information if available
                if (reply.lastUsed) {
                    embed.addFields({
                        name: 'Last Used',
                        value: `<t:${Math.floor(reply.lastUsed / 1000)}:R>`,
                        inline: true
                    });
                }
                
                await interaction.reply({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('Error showing auto-replies:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed(
                    translate('common.error', interaction.guild.id), 
                    'There was an error showing the auto-replies. Please try again.'
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