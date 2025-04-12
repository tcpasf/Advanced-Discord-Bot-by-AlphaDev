const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { autoReplies } = require('../../utils/database');
const { translate } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auto-reply-add')
        .setDescription('Add a new auto-reply')
        .addStringOption(option => 
            option.setName('trigger')
                .setDescription('The text that triggers this auto-reply')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('response')
                .setDescription('The text to reply with')
                .setRequired(true)
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
            option.setName('channel')
                .setDescription('Restrict this auto-reply to a specific channel')
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
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const trigger = interaction.options.getString('trigger');
            const response = interaction.options.getString('response');
            
            // Get optional parameters
            const matchType = interaction.options.getString('match_type') || 'contains';
            const caseSensitive = interaction.options.getBoolean('case_sensitive') || false;
            const chance = interaction.options.getInteger('chance') || 100;
            const cooldownSeconds = interaction.options.getInteger('cooldown') || 0;
            const cooldown = cooldownSeconds * 1000; // Convert to milliseconds
            const channel = interaction.options.getChannel('channel');
            const deleteOriginal = interaction.options.getBoolean('delete_original') || false;
            const replyInDM = interaction.options.getBoolean('reply_in_dm') || false;
            
            // Create options object
            const options = {
                matchType,
                caseSensitive,
                chance,
                cooldown,
                deleteOriginal,
                replyInDM
            };
            
            // Add channel restriction if specified
            if (channel) {
                options.allowedChannels = [channel.id];
            }
            
            // Add the auto-reply
            const newReply = autoReplies.addReply(guildId, trigger, response, options);
            
            // Create success embed
            const embed = createSuccessEmbed(
                'Auto-Reply Added',
                `A new auto-reply has been created with ID: \`${newReply.id}\``
            );
            
            // Add fields with details
            embed.addFields(
                { name: 'Trigger', value: `\`${trigger}\``, inline: true },
                { name: 'Match Type', value: matchType, inline: true },
                { name: 'Case Sensitive', value: caseSensitive ? 'Yes' : 'No', inline: true },
                { name: 'Response', value: response.length > 100 ? response.substring(0, 97) + '...' : response }
            );
            
            if (channel) {
                embed.addFields({ name: 'Channel', value: `<#${channel.id}>`, inline: true });
            }
            
            if (chance < 100) {
                embed.addFields({ name: 'Chance', value: `${chance}%`, inline: true });
            }
            
            if (cooldown > 0) {
                embed.addFields({ name: 'Cooldown', value: `${cooldownSeconds} seconds`, inline: true });
            }
            
            if (deleteOriginal) {
                embed.addFields({ name: 'Delete Original', value: 'Yes', inline: true });
            }
            
            if (replyInDM) {
                embed.addFields({ name: 'Reply in DM', value: 'Yes', inline: true });
            }
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error adding auto-reply:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed(
                    translate('common.error', interaction.guild.id), 
                    'There was an error adding the auto-reply. Please try again.'
                )],
                ephemeral: true
            });
        }
    }
};