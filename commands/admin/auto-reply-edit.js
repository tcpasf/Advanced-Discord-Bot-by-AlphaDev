const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { autoReplies } = require('../../utils/database');
const { translate } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-reply-edit')
        .setDescription('Edit an existing auto-reply')
        .addStringOption(option => 
            option.setName('id')
                .setDescription('The ID of the auto-reply to edit')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option => 
            option.setName('trigger')
                .setDescription('The new trigger text')
                .setRequired(false)
        )
        .addStringOption(option => 
            option.setName('response')
                .setDescription('The new response text')
                .setRequired(false)
        )
        .addStringOption(option => 
            option.setName('match_type')
                .setDescription('How to match the trigger text')
                .setRequired(false)
                .addChoices(
                    { name: 'Contains', value: 'contains' },
                    { name: 'Exact Match', value: 'exact' },
                    { name: 'Starts With', value: 'startsWith' },
                    { name: 'Ends With', value: 'endsWith' },
                    { name: 'Regex Pattern', value: 'regex' }
                )
        )
        .addBooleanOption(option => 
            option.setName('case_sensitive')
                .setDescription('Whether the trigger is case sensitive')
                .setRequired(false)
        )
        .addIntegerOption(option => 
            option.setName('chance')
                .setDescription('Percentage chance to reply (1-100)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .addIntegerOption(option => 
            option.setName('cooldown')
                .setDescription('Cooldown in seconds before this reply can be used again')
                .setRequired(false)
                .setMinValue(0)
        )
        .addChannelOption(option => 
            option.setName('add_channel')
                .setDescription('Add a channel where this auto-reply can be used')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption(option => 
            option.setName('remove_channel')
                .setDescription('Remove a channel from where this auto-reply can be used')
                .setRequired(false)
                .addChannelTypes(ChannelType.GuildText)
        )
        .addBooleanOption(option => 
            option.setName('delete_original')
                .setDescription('Delete the original message')
                .setRequired(false)
        )
        .addBooleanOption(option => 
            option.setName('reply_in_dm')
                .setDescription('Send the reply in DM instead of in the channel')
                .setRequired(false)
        )
        .addBooleanOption(option => 
            option.setName('enabled')
                .setDescription('Enable or disable this auto-reply')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const replyId = interaction.options.getString('id');
            
            // Get the existing auto-reply
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
            
            // Collect updates
            const updates = {};
            
            // Check each option and update if provided
            const trigger = interaction.options.getString('trigger');
            if (trigger !== null) updates.trigger = trigger;
            
            const response = interaction.options.getString('response');
            if (response !== null) updates.response = response;
            
            const matchType = interaction.options.getString('match_type');
            if (matchType !== null) updates.matchType = matchType;
            
            const caseSensitive = interaction.options.getBoolean('case_sensitive');
            if (caseSensitive !== null) updates.caseSensitive = caseSensitive;
            
            const chance = interaction.options.getInteger('chance');
            if (chance !== null) updates.chance = chance;
            
            const cooldown = interaction.options.getInteger('cooldown');
            if (cooldown !== null) updates.cooldown = cooldown * 1000; // Convert to milliseconds
            
            const deleteOriginal = interaction.options.getBoolean('delete_original');
            if (deleteOriginal !== null) updates.deleteOriginal = deleteOriginal;
            
            const replyInDM = interaction.options.getBoolean('reply_in_dm');
            if (replyInDM !== null) updates.replyInDM = replyInDM;
            
            const enabled = interaction.options.getBoolean('enabled');
            if (enabled !== null) updates.enabled = enabled;
            
            // Handle channel additions/removals
            const addChannel = interaction.options.getChannel('add_channel');
            if (addChannel) {
                const allowedChannels = [...(existingReply.allowedChannels || [])];
                if (!allowedChannels.includes(addChannel.id)) {
                    allowedChannels.push(addChannel.id);
                    updates.allowedChannels = allowedChannels;
                }
            }
            
            const removeChannel = interaction.options.getChannel('remove_channel');
            if (removeChannel && existingReply.allowedChannels && existingReply.allowedChannels.includes(removeChannel.id)) {
                updates.allowedChannels = existingReply.allowedChannels.filter(id => id !== removeChannel.id);
            }
            
            // If no updates were provided
            if (Object.keys(updates).length === 0) {
                return interaction.reply({
                    embeds: [createErrorEmbed(
                        'No Changes',
                        'You need to provide at least one field to update.'
                    )],
                    ephemeral: true
                });
            }
            
            // Update the auto-reply
            const updatedReply = autoReplies.editReply(guildId, replyId, updates);
            
            // Create success embed
            const embed = createSuccessEmbed(
                'Auto-Reply Updated',
                `Auto-reply with ID \`${replyId}\` has been updated.`
            );
            
            // Add fields showing what was updated
            for (const [key, value] of Object.entries(updates)) {
                let displayValue = value;
                
                // Format special values for display
                if (key === 'cooldown') {
                    displayValue = `${value / 1000} seconds`;
                } else if (key === 'allowedChannels') {
                    displayValue = value.length > 0 
                        ? value.map(id => `<#${id}>`).join(', ')
                        : 'All channels';
                } else if (typeof value === 'boolean') {
                    displayValue = value ? 'Yes' : 'No';
                }
                
                embed.addFields({
                    name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
                    value: `${displayValue}`,
                    inline: true
                });
            }
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error editing auto-reply:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed(
                    translate('common.error', interaction.guild.id), 
                    'There was an error editing the auto-reply. Please try again.'
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