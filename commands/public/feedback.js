const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { settings } = require('../../utils/database');
const { translate } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('feedback')
        .setDescription('Submit feedback')
        .addStringOption(option => 
            option.setName('feedback')
                .setDescription('Your feedback')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('category')
                .setDescription('Category of your feedback')
                .setRequired(false)
                .addChoices(
                    { name: 'General', value: 'general' },
                    { name: 'Bug Report', value: 'bug' },
                    { name: 'Feature Request', value: 'feature' },
                    { name: 'Improvement', value: 'improvement' },
                    { name: 'Other', value: 'other' }
                )
        )
        .addAttachmentOption(option => 
            option.setName('attachment')
                .setDescription('Optional image or file to attach to your feedback')
                .setRequired(false)
        ),
    
    async execute(interaction) {
        try {
            const guildId = interaction.guild.id;
            const feedbackText = interaction.options.getString('feedback');
            const category = interaction.options.getString('category') || 'general';
            const attachment = interaction.options.getAttachment('attachment');
            
            // Get guild settings
            const guildSettings = settings.getGuildSettings(guildId);
            
            // Check if feedback is enabled
            if (!guildSettings.feedback || 
                !guildSettings.feedback.feedback || 
                !guildSettings.feedback.feedback.enabled ||
                !guildSettings.feedback.feedback.channelId) {
                
                return interaction.reply({
                    embeds: [createErrorEmbed(
                        'Feedback Disabled',
                        'Feedback is not enabled on this server.'
                    )],
                    ephemeral: true
                });
            }
            
            // Get the feedback channel
            const feedbackChannelId = guildSettings.feedback.feedback.channelId;
            const feedbackChannel = await interaction.guild.channels.fetch(feedbackChannelId).catch(() => null);
            
            if (!feedbackChannel) {
                return interaction.reply({
                    embeds: [createErrorEmbed(
                        'Channel Not Found',
                        'The feedback channel could not be found. Please contact an administrator.'
                    )],
                    ephemeral: true
                });
            }
            
            // Increment feedback count
            if (!guildSettings.feedback.feedback.count) {
                guildSettings.feedback.feedback.count = 0;
            }
            guildSettings.feedback.feedback.count++;
            const feedbackNumber = guildSettings.feedback.feedback.count;
            
            // Save settings
            settings.save();
            
            // Create feedback embed
            const feedbackEmbed = new EmbedBuilder()
                .setTitle(`Feedback #${feedbackNumber} - ${category.charAt(0).toUpperCase() + category.slice(1)}`)
                .setDescription(feedbackText)
                .setColor(getCategoryColor(category))
                .setTimestamp();
            
            // Set author based on anonymity setting
            if (!guildSettings.feedback.feedback.anonymous) {
                feedbackEmbed.setAuthor({
                    name: interaction.user.tag,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });
                feedbackEmbed.setFooter({ text: `ID: ${interaction.user.id}` });
            } else {
                feedbackEmbed.setAuthor({
                    name: 'Anonymous User',
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                });
                feedbackEmbed.setFooter({ text: `Feedback ID: ${feedbackNumber}` });
            }
            
            // Add attachment if provided
            if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
                feedbackEmbed.setImage(attachment.url);
            }
            
            // Create action buttons
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`feedback_resolve_${feedbackNumber}`)
                        .setLabel('✅ Mark as Resolved')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`feedback_reply_${feedbackNumber}`)
                        .setLabel('💬 Reply')
                        .setStyle(ButtonStyle.Primary)
                );
            
            // Send the feedback to the channel
            const feedbackMessage = await feedbackChannel.send({
                embeds: [feedbackEmbed],
                components: [actionRow],
                files: attachment && !attachment.contentType.startsWith('image/') ? [attachment] : []
            });
            
            // Store the feedback message ID in the database for future reference
            if (!guildSettings.feedback.feedback.items) {
                guildSettings.feedback.feedback.items = {};
            }
            
            guildSettings.feedback.feedback.items[feedbackNumber] = {
                messageId: feedbackMessage.id,
                userId: interaction.user.id,
                content: feedbackText,
                category: category,
                timestamp: Date.now(),
                status: 'open',
                anonymous: guildSettings.feedback.feedback.anonymous,
                replies: []
            };
            
            settings.save();
            
            // Reply to the user
            await interaction.reply({
                embeds: [createSuccessEmbed(
                    'Feedback Submitted',
                    `Your feedback has been submitted! ${!guildSettings.feedback.feedback.anonymous ? `You can view it in ${feedbackChannel}.` : ''}`
                )],
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error submitting feedback:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed(
                    translate('common.error', interaction.guild.id), 
                    'There was an error submitting your feedback. Please try again.'
                )],
                ephemeral: true
            });
        }
    }
};

// Helper function to get color based on category
function getCategoryColor(category) {
    switch (category) {
        case 'bug':
            return '#e74c3c'; // Red
        case 'feature':
            return '#2ecc71'; // Green
        case 'improvement':
            return '#3498db'; // Blue
        case 'other':
            return '#9b59b6'; // Purple
        case 'general':
        default:
            return '#f1c40f'; // Yellow
    }
}