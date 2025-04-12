const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { settings } = require('../../utils/database');
const { translate } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion')
        .addStringOption(option => 
            option.setName('suggestion')
                .setDescription('Your suggestion')
                .setRequired(true)
        )
        .addAttachmentOption(option => 
            option.setName('attachment')
                .setDescription('Optional image or file to attach to your suggestion')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const suggestion = interaction.options.getString('suggestion');
            const attachment = interaction.options.getAttachment('attachment');
            
            // Get guild settings
            const guildSettings = settings.getGuildSettings(guildId);
            
            // Check if suggestions are enabled
            if (!guildSettings.feedback || 
                !guildSettings.feedback.suggestions || 
                !guildSettings.feedback.suggestions.enabled ||
                !guildSettings.feedback.suggestions.channelId) {
                
                return interaction.reply({
                    embeds: [createErrorEmbed(
                        'Suggestions Disabled',
                        'Suggestions are not enabled on this server.'
                    )],
                    ephemeral: true
                });
            }
            
            // Get the suggestions channel
            const suggestionsChannelId = guildSettings.feedback.suggestions.channelId;
            const suggestionsChannel = await interaction.guild.channels.fetch(suggestionsChannelId).catch(() => null);
            
            if (!suggestionsChannel) {
                return interaction.reply({
                    embeds: [createErrorEmbed(
                        'Channel Not Found',
                        'The suggestions channel could not be found. Please contact an administrator.'
                    )],
                    ephemeral: true
                });
            }
            
            // Increment suggestion count
            if (!guildSettings.feedback.suggestions.count) {
                guildSettings.feedback.suggestions.count = 0;
            }
            guildSettings.feedback.suggestions.count++;
            const suggestionNumber = guildSettings.feedback.suggestions.count;
            
            // Save settings
            settings.save();
            
            // Create suggestion embed
            const suggestionEmbed = new EmbedBuilder()
                .setTitle(`Suggestion #${suggestionNumber}`)
                .setDescription(suggestion)
                .setColor('#3498db')
                .setAuthor({
                    name: interaction.user.tag,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp()
                .setFooter({ text: `ID: ${interaction.user.id}` });
            
            // Add attachment if provided
            if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
                suggestionEmbed.setImage(attachment.url);
            }
            
            // Create voting buttons
            const voteRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suggestion_upvote_${suggestionNumber}`)
                        .setLabel('👍 0')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_downvote_${suggestionNumber}`)
                        .setLabel('👎 0')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_comment_${suggestionNumber}`)
                        .setLabel('💬 Comment')
                        .setStyle(ButtonStyle.Primary)
                );
            
            // Create status buttons for staff
            const statusRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`suggestion_approve_${suggestionNumber}`)
                        .setLabel('✅ Approve')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_consider_${suggestionNumber}`)
                        .setLabel('🤔 Consider')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`suggestion_deny_${suggestionNumber}`)
                        .setLabel('❌ Deny')
                        .setStyle(ButtonStyle.Danger)
                );
            
            // Send the suggestion to the channel
            let pingText = '';
            if (guildSettings.feedback.suggestions.pingRoleId) {
                pingText = `<@&${guildSettings.feedback.suggestions.pingRoleId}>`;
            }
            
            const suggestionMessage = await suggestionsChannel.send({
                content: pingText,
                embeds: [suggestionEmbed],
                components: [voteRow, statusRow],
                files: attachment && !attachment.contentType.startsWith('image/') ? [attachment] : []
            });
            
            // Store the suggestion message ID in the database for future reference
            if (!guildSettings.feedback.suggestions.items) {
                guildSettings.feedback.suggestions.items = {};
            }
            
            guildSettings.feedback.suggestions.items[suggestionNumber] = {
                messageId: suggestionMessage.id,
                userId: interaction.user.id,
                content: suggestion,
                timestamp: Date.now(),
                status: 'pending',
                votes: {
                    up: [],
                    down: []
                },
                comments: []
            };
            
            settings.save();
            
            // Reply to the user
            await interaction.reply({
                embeds: [createSuccessEmbed(
                    'Suggestion Submitted',
                    `Your suggestion has been submitted! You can view it in ${suggestionsChannel}.`
                )],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error submitting suggestion:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed(
                    translate('common.error', interaction.guild.id), 
                    'There was an error submitting your suggestion. Please try again.'
                )],
                ephemeral: true
            });
        }
    }
};