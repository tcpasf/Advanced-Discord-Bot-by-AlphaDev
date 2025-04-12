const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { settings } = require('../../utils/database');
const { translate } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback-setup')
        .setDescription('Set up feedback and suggestion channels')
        .addSubcommand(subcommand =>
            subcommand
                .setName('suggestions')
                .setDescription('Set up the suggestions channel')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where suggestions will be posted')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addRoleOption(option => 
                    option.setName('ping_role')
                        .setDescription('Role to ping when a new suggestion is posted (optional)')
                        .setRequired(false)
                )
                .addBooleanOption(option => 
                    option.setName('require_approval')
                        .setDescription('Whether suggestions require staff approval before being posted')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('feedback')
                .setDescription('Set up the feedback channel')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where feedback will be posted')
                        .setRequired(true)
                        .addChannelTypes(ChannelType.GuildText)
                )
                .addBooleanOption(option => 
                    option.setName('anonymous')
                        .setDescription('Whether feedback should be anonymous')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show the current feedback and suggestion settings')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const subcommand = interaction.options.getSubcommand();
            
            // Get guild settings
            const guildSettings = settings.getGuildSettings(guildId);
            
            // Initialize feedback settings if they don't exist
            if (!guildSettings.feedback) {
                guildSettings.feedback = {
                    suggestions: {
                        enabled: false,
                        channelId: null,
                        pingRoleId: null,
                        requireApproval: false,
                        approvalChannelId: null,
                        count: 0
                    },
                    feedback: {
                        enabled: false,
                        channelId: null,
                        anonymous: false,
                        count: 0
                    }
                };
            }
            
            if (subcommand === 'suggestions') {
                const channel = interaction.options.getChannel('channel');
                const pingRole = interaction.options.getRole('ping_role');
                const requireApproval = interaction.options.getBoolean('require_approval');
                
                // Update settings
                guildSettings.feedback.suggestions.enabled = true;
                guildSettings.feedback.suggestions.channelId = channel.id;
                
                if (pingRole) {
                    guildSettings.feedback.suggestions.pingRoleId = pingRole.id;
                }
                
                if (requireApproval !== null) {
                    guildSettings.feedback.suggestions.requireApproval = requireApproval;
                }
                
                // Save settings
                settings.save();
                
                // Create success embed
                const embed = createSuccessEmbed(
                    'Suggestions Channel Set Up',
                    `Suggestions will now be posted in ${channel}`
                );
                
                // Add additional information
                if (pingRole) {
                    embed.addFields({ 
                        name: 'Ping Role', 
                        value: `${pingRole} will be pinged for new suggestions`, 
                        inline: false 
                    });
                }
                
                if (requireApproval !== null) {
                    embed.addFields({ 
                        name: 'Approval Required', 
                        value: requireApproval ? 'Yes' : 'No', 
                        inline: false 
                    });
                }
                
                await interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'feedback') {
                const channel = interaction.options.getChannel('channel');
                const anonymous = interaction.options.getBoolean('anonymous');
                
                // Update settings
                guildSettings.feedback.feedback.enabled = true;
                guildSettings.feedback.feedback.channelId = channel.id;
                
                if (anonymous !== null) {
                    guildSettings.feedback.feedback.anonymous = anonymous;
                }
                
                // Save settings
                settings.save();
                
                // Create success embed
                const embed = createSuccessEmbed(
                    'Feedback Channel Set Up',
                    `Feedback will now be posted in ${channel}`
                );
                
                // Add additional information
                if (anonymous !== null) {
                    embed.addFields({ 
                        name: 'Anonymous Feedback', 
                        value: anonymous ? 'Yes' : 'No', 
                        inline: false 
                    });
                }
                
                await interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'status') {
                const feedbackSettings = guildSettings.feedback;
                
                // Create embed to show current settings
                const embed = createSuccessEmbed(
                    'Feedback & Suggestions Settings',
                    'Here are the current settings for feedback and suggestions'
                );
                
                // Add suggestions settings
                const suggestionsEnabled = feedbackSettings.suggestions.enabled;
                const suggestionsChannel = feedbackSettings.suggestions.channelId 
                    ? `<#${feedbackSettings.suggestions.channelId}>` 
                    : 'Not set';
                
                embed.addFields({ 
                    name: 'Suggestions', 
                    value: suggestionsEnabled ? `Enabled in ${suggestionsChannel}` : 'Disabled', 
                    inline: false 
                });
                
                if (suggestionsEnabled) {
                    if (feedbackSettings.suggestions.pingRoleId) {
                        embed.addFields({ 
                            name: 'Suggestion Ping Role', 
                            value: `<@&${feedbackSettings.suggestions.pingRoleId}>`, 
                            inline: true 
                        });
                    }
                    
                    embed.addFields({ 
                        name: 'Require Approval', 
                        value: feedbackSettings.suggestions.requireApproval ? 'Yes' : 'No', 
                        inline: true 
                    });
                    
                    embed.addFields({ 
                        name: 'Suggestions Count', 
                        value: `${feedbackSettings.suggestions.count || 0}`, 
                        inline: true 
                    });
                }
                
                // Add feedback settings
                const feedbackEnabled = feedbackSettings.feedback.enabled;
                const feedbackChannel = feedbackSettings.feedback.channelId 
                    ? `<#${feedbackSettings.feedback.channelId}>` 
                    : 'Not set';
                
                embed.addFields({ 
                    name: 'Feedback', 
                    value: feedbackEnabled ? `Enabled in ${feedbackChannel}` : 'Disabled', 
                    inline: false 
                });
                
                if (feedbackEnabled) {
                    embed.addFields({ 
                        name: 'Anonymous Feedback', 
                        value: feedbackSettings.feedback.anonymous ? 'Yes' : 'No', 
                        inline: true 
                    });
                    
                    embed.addFields({ 
                        name: 'Feedback Count', 
                        value: `${feedbackSettings.feedback.count || 0}`, 
                        inline: true 
                    });
                }
                
                await interaction.reply({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('Error setting up feedback:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed(
                    translate('common.error', interaction.guild.id), 
                    'There was an error setting up feedback. Please try again.'
                )],
                ephemeral: true
            });
        }
    }
};