const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { settings } = require('../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../utils/embeds');

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction) {
        // Handle button interactions for suggestions and feedback
        if (interaction.isButton()) {
            const customId = interaction.customId;
            
            // Suggestion buttons
            if (customId.startsWith('suggestion_')) {
                await handleSuggestionButton(interaction);
            }
            
            // Feedback buttons
            else if (customId.startsWith('feedback_')) {
                await handleFeedbackButton(interaction);
            }
        }
        
        // Handle modal submissions
        else if (interaction.isModalSubmit()) {
            const customId = interaction.customId;
            
            // Suggestion comment modal
            if (customId.startsWith('suggestion_comment_modal_')) {
                await handleSuggestionCommentModal(interaction);
            }
            
            // Feedback reply modal
            else if (customId.startsWith('feedback_reply_modal_')) {
                await handleFeedbackReplyModal(interaction);
            }
        }
    }
};

// Handle suggestion buttons (upvote, downvote, comment, approve, consider, deny)
async function handleSuggestionButton(interaction) {
    try {
        const customId = interaction.customId;
        const parts = customId.split('_');
        const action = parts[1];
        const suggestionNumber = parseInt(parts[2]);
        
        const guildId = interaction.guild.id;
        const guildSettings = settings.getGuildSettings(guildId);
        
        // Check if suggestions are enabled
        if (!guildSettings.feedback || 
            !guildSettings.feedback.suggestions || 
            !guildSettings.feedback.suggestions.enabled ||
            !guildSettings.feedback.suggestions.items ||
            !guildSettings.feedback.suggestions.items[suggestionNumber]) {
            
            return interaction.reply({
                embeds: [createErrorEmbed(
                    'Error',
                    'This suggestion could not be found or has been removed.'
                )],
                ephemeral: true
            });
        }
        
        const suggestion = guildSettings.feedback.suggestions.items[suggestionNumber];
        
        // Handle different button actions
        switch (action) {
            case 'upvote':
                await handleSuggestionVote(interaction, suggestion, suggestionNumber, true);
                break;
                
            case 'downvote':
                await handleSuggestionVote(interaction, suggestion, suggestionNumber, false);
                break;
                
            case 'comment':
                await showSuggestionCommentModal(interaction, suggestionNumber);
                break;
                
            case 'approve':
            case 'consider':
            case 'deny':
                await handleSuggestionStatus(interaction, suggestion, suggestionNumber, action);
                break;
        }
        
    } catch (error) {
        console.error('Error handling suggestion button:', error);
        
        await interaction.reply({
            embeds: [createErrorEmbed(
                'Error',
                'There was an error processing your action. Please try again.'
            )],
            ephemeral: true
        });
    }
}

// Handle feedback buttons (resolve, reply)
async function handleFeedbackButton(interaction) {
    try {
        const customId = interaction.customId;
        const parts = customId.split('_');
        const action = parts[1];
        const feedbackNumber = parseInt(parts[2]);
        
        const guildId = interaction.guild.id;
        const guildSettings = settings.getGuildSettings(guildId);
        
        // Check if feedback is enabled
        if (!guildSettings.feedback || 
            !guildSettings.feedback.feedback || 
            !guildSettings.feedback.feedback.enabled ||
            !guildSettings.feedback.feedback.items ||
            !guildSettings.feedback.feedback.items[feedbackNumber]) {
            
            return interaction.reply({
                embeds: [createErrorEmbed(
                    'Error',
                    'This feedback could not be found or has been removed.'
                )],
                ephemeral: true
            });
        }
        
        const feedback = guildSettings.feedback.feedback.items[feedbackNumber];
        
        // Handle different button actions
        switch (action) {
            case 'resolve':
                await handleFeedbackResolve(interaction, feedback, feedbackNumber);
                break;
                
            case 'reply':
                await showFeedbackReplyModal(interaction, feedbackNumber);
                break;
        }
        
    } catch (error) {
        console.error('Error handling feedback button:', error);
        
        await interaction.reply({
            embeds: [createErrorEmbed(
                'Error',
                'There was an error processing your action. Please try again.'
            )],
            ephemeral: true
        });
    }
}

// Handle suggestion votes (upvote/downvote)
async function handleSuggestionVote(interaction, suggestion, suggestionNumber, isUpvote) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    
    // Initialize votes if they don't exist
    if (!suggestion.votes) {
        suggestion.votes = { up: [], down: [] };
    }
    
    const upvotes = suggestion.votes.up || [];
    const downvotes = suggestion.votes.down || [];
    
    // Check if user has already voted
    const hasUpvoted = upvotes.includes(userId);
    const hasDownvoted = downvotes.includes(userId);
    
    // Handle the vote
    if (isUpvote) {
        if (hasUpvoted) {
            // Remove upvote if already upvoted
            suggestion.votes.up = upvotes.filter(id => id !== userId);
        } else {
            // Add upvote and remove downvote if exists
            suggestion.votes.up.push(userId);
            suggestion.votes.down = downvotes.filter(id => id !== userId);
        }
    } else {
        if (hasDownvoted) {
            // Remove downvote if already downvoted
            suggestion.votes.down = downvotes.filter(id => id !== userId);
        } else {
            // Add downvote and remove upvote if exists
            suggestion.votes.down.push(userId);
            suggestion.votes.up = upvotes.filter(id => id !== userId);
        }
    }
    
    // Save the changes
    settings.save();
    
    // Update the message
    await updateSuggestionMessage(interaction, suggestion, suggestionNumber);
    
    // Acknowledge the interaction
    await interaction.reply({
        content: isUpvote 
            ? (hasUpvoted ? 'You removed your upvote.' : 'You upvoted this suggestion!') 
            : (hasDownvoted ? 'You removed your downvote.' : 'You downvoted this suggestion.'),
        ephemeral: true
    });
}

// Show modal for commenting on a suggestion
async function showSuggestionCommentModal(interaction, suggestionNumber) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`suggestion_comment_modal_${suggestionNumber}`)
        .setTitle('Add a Comment');
    
    // Add the comment input
    const commentInput = new TextInputBuilder()
        .setCustomId('comment_text')
        .setLabel('Your comment')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter your comment here...')
        .setRequired(true)
        .setMaxLength(1000);
    
    // Add the input to the modal
    const actionRow = new ActionRowBuilder().addComponents(commentInput);
    modal.addComponents(actionRow);
    
    // Show the modal
    await interaction.showModal(modal);
}

// Handle suggestion comment modal submission
async function handleSuggestionCommentModal(interaction) {
    try {
        const customId = interaction.customId;
        const suggestionNumber = parseInt(customId.split('_')[3]);
        const commentText = interaction.fields.getTextInputValue('comment_text');
        
        const guildId = interaction.guild.id;
        const guildSettings = settings.getGuildSettings(guildId);
        
        // Check if suggestion exists
        if (!guildSettings.feedback?.suggestions?.items?.[suggestionNumber]) {
            return interaction.reply({
                embeds: [createErrorEmbed(
                    'Error',
                    'This suggestion could not be found or has been removed.'
                )],
                ephemeral: true
            });
        }
        
        const suggestion = guildSettings.feedback.suggestions.items[suggestionNumber];
        
        // Initialize comments if they don't exist
        if (!suggestion.comments) {
            suggestion.comments = [];
        }
        
        // Add the comment
        suggestion.comments.push({
            userId: interaction.user.id,
            username: interaction.user.tag,
            content: commentText,
            timestamp: Date.now()
        });
        
        // Save the changes
        settings.save();
        
        // Update the message
        const message = await interaction.channel.messages.fetch(suggestion.messageId).catch(() => null);
        
        if (message) {
            // Get the original embed
            const embed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(embed);
            
            // Add a field for the new comment
            newEmbed.addFields({
                name: `💬 Comment from ${interaction.user.tag}`,
                value: commentText
            });
            
            // Update the message
            await message.edit({ embeds: [newEmbed] });
        }
        
        // Acknowledge the interaction
        await interaction.reply({
            embeds: [createSuccessEmbed(
                'Comment Added',
                'Your comment has been added to the suggestion.'
            )],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling suggestion comment:', error);
        
        await interaction.reply({
            embeds: [createErrorEmbed(
                'Error',
                'There was an error adding your comment. Please try again.'
            )],
            ephemeral: true
        });
    }
}

// Handle suggestion status changes (approve, consider, deny)
async function handleSuggestionStatus(interaction, suggestion, suggestionNumber, action) {
    try {
        // Check if user has permission
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!member.permissions.has('ManageGuild')) {
            return interaction.reply({
                embeds: [createErrorEmbed(
                    'Permission Denied',
                    'You do not have permission to change suggestion statuses.'
                )],
                ephemeral: true
            });
        }
        
        // Update the suggestion status
        let status;
        let color;
        let statusText;
        
        switch (action) {
            case 'approve':
                status = 'approved';
                color = '#2ecc71'; // Green
                statusText = '✅ Approved';
                break;
                
            case 'consider':
                status = 'considered';
                color = '#f39c12'; // Orange
                statusText = '🤔 Under Consideration';
                break;
                
            case 'deny':
                status = 'denied';
                color = '#e74c3c'; // Red
                statusText = '❌ Denied';
                break;
        }
        
        suggestion.status = status;
        suggestion.statusUpdatedBy = interaction.user.id;
        suggestion.statusUpdatedAt = Date.now();
        
        // Save the changes
        const guildId = interaction.guild.id;
        settings.save();
        
        // Update the message
        const message = await interaction.channel.messages.fetch(suggestion.messageId).catch(() => null);
        
        if (message) {
            // Get the original embed
            const embed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(embed);
            
            // Update the embed
            newEmbed.setColor(color);
            newEmbed.addFields({
                name: 'Status',
                value: `${statusText} by ${interaction.user.tag}`
            });
            
            // Update the message
            await message.edit({ embeds: [newEmbed] });
        }
        
        // Acknowledge the interaction
        await interaction.reply({
            embeds: [createSuccessEmbed(
                'Status Updated',
                `The suggestion has been marked as ${status}.`
            )],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error updating suggestion status:', error);
        
        await interaction.reply({
            embeds: [createErrorEmbed(
                'Error',
                'There was an error updating the suggestion status. Please try again.'
            )],
            ephemeral: true
        });
    }
}

// Update suggestion message with current votes
async function updateSuggestionMessage(interaction, suggestion, suggestionNumber) {
    try {
        const message = await interaction.message;
        
        if (!message) return;
        
        // Get the current components
        const components = message.components;
        
        // Update the vote counts in the buttons
        const upvoteCount = suggestion.votes.up.length;
        const downvoteCount = suggestion.votes.down.length;
        
        // Create new components with updated counts
        const voteRow = ActionRowBuilder.from(components[0]);
        const statusRow = components[1] ? ActionRowBuilder.from(components[1]) : null;
        
        // Update the upvote and downvote buttons
        voteRow.components[0].setLabel(`👍 ${upvoteCount}`);
        voteRow.components[1].setLabel(`👎 ${downvoteCount}`);
        
        // Update the message
        const updateData = { components: [voteRow] };
        if (statusRow) updateData.components.push(statusRow);
        
        await message.edit(updateData);
        
    } catch (error) {
        console.error('Error updating suggestion message:', error);
    }
}

// Handle feedback resolve button
async function handleFeedbackResolve(interaction, feedback, feedbackNumber) {
    try {
        // Check if user has permission
        const member = await interaction.guild.members.fetch(interaction.user.id);
        if (!member.permissions.has('ManageGuild')) {
            return interaction.reply({
                embeds: [createErrorEmbed(
                    'Permission Denied',
                    'You do not have permission to resolve feedback.'
                )],
                ephemeral: true
            });
        }
        
        // Update the feedback status
        feedback.status = 'resolved';
        feedback.resolvedBy = interaction.user.id;
        feedback.resolvedAt = Date.now();
        
        // Save the changes
        const guildId = interaction.guild.id;
        settings.save();
        
        // Update the message
        const message = await interaction.channel.messages.fetch(feedback.messageId).catch(() => null);
        
        if (message) {
            // Get the original embed
            const embed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(embed);
            
            // Update the embed
            newEmbed.setColor('#2ecc71'); // Green
            newEmbed.addFields({
                name: 'Status',
                value: `✅ Resolved by ${interaction.user.tag} on ${new Date().toLocaleDateString()}`
            });
            
            // Update the buttons
            const actionRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`feedback_reopen_${feedbackNumber}`)
                        .setLabel('🔄 Reopen')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId(`feedback_reply_${feedbackNumber}`)
                        .setLabel('💬 Reply')
                        .setStyle(ButtonStyle.Primary)
                );
            
            // Update the message
            await message.edit({ embeds: [newEmbed], components: [actionRow] });
        }
        
        // Acknowledge the interaction
        await interaction.reply({
            embeds: [createSuccessEmbed(
                'Feedback Resolved',
                'The feedback has been marked as resolved.'
            )],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error resolving feedback:', error);
        
        await interaction.reply({
            embeds: [createErrorEmbed(
                'Error',
                'There was an error resolving the feedback. Please try again.'
            )],
            ephemeral: true
        });
    }
}

// Show modal for replying to feedback
async function showFeedbackReplyModal(interaction, feedbackNumber) {
    // Create the modal
    const modal = new ModalBuilder()
        .setCustomId(`feedback_reply_modal_${feedbackNumber}`)
        .setTitle('Reply to Feedback');
    
    // Add the reply input
    const replyInput = new TextInputBuilder()
        .setCustomId('reply_text')
        .setLabel('Your reply')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Enter your reply here...')
        .setRequired(true)
        .setMaxLength(1000);
    
    // Add the input to the modal
    const actionRow = new ActionRowBuilder().addComponents(replyInput);
    modal.addComponents(actionRow);
    
    // Show the modal
    await interaction.showModal(modal);
}

// Handle feedback reply modal submission
async function handleFeedbackReplyModal(interaction) {
    try {
        const customId = interaction.customId;
        const feedbackNumber = parseInt(customId.split('_')[3]);
        const replyText = interaction.fields.getTextInputValue('reply_text');
        
        const guildId = interaction.guild.id;
        const guildSettings = settings.getGuildSettings(guildId);
        
        // Check if feedback exists
        if (!guildSettings.feedback?.feedback?.items?.[feedbackNumber]) {
            return interaction.reply({
                embeds: [createErrorEmbed(
                    'Error',
                    'This feedback could not be found or has been removed.'
                )],
                ephemeral: true
            });
        }
        
        const feedback = guildSettings.feedback.feedback.items[feedbackNumber];
        
        // Initialize replies if they don't exist
        if (!feedback.replies) {
            feedback.replies = [];
        }
        
        // Add the reply
        feedback.replies.push({
            userId: interaction.user.id,
            username: interaction.user.tag,
            content: replyText,
            timestamp: Date.now()
        });
        
        // Save the changes
        settings.save();
        
        // Update the message
        const message = await interaction.channel.messages.fetch(feedback.messageId).catch(() => null);
        
        if (message) {
            // Get the original embed
            const embed = message.embeds[0];
            const newEmbed = EmbedBuilder.from(embed);
            
            // Add a field for the new reply
            newEmbed.addFields({
                name: `💬 Reply from ${interaction.user.tag}`,
                value: replyText
            });
            
            // Update the message
            await message.edit({ embeds: [newEmbed] });
        }
        
        // Try to notify the feedback author if not anonymous
        if (!feedback.anonymous && feedback.userId) {
            try {
                const user = await interaction.client.users.fetch(feedback.userId);
                const notificationEmbed = new EmbedBuilder()
                    .setTitle(`Reply to Your Feedback #${feedbackNumber}`)
                    .setDescription(`Your feedback has received a reply from ${interaction.user.tag}:`)
                    .addFields({ name: 'Reply', value: replyText })
                    .setColor('#3498db')
                    .setTimestamp();
                
                await user.send({ embeds: [notificationEmbed] }).catch(() => {
                    // Silently fail if we can't DM the user
                });
            } catch (error) {
                console.error('Error notifying feedback author:', error);
            }
        }
        
        // Acknowledge the interaction
        await interaction.reply({
            embeds: [createSuccessEmbed(
                'Reply Added',
                'Your reply has been added to the feedback.'
            )],
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error handling feedback reply:', error);
        
        await interaction.reply({
            embeds: [createErrorEmbed(
                'Error',
                'There was an error adding your reply. Please try again.'
            )],
            ephemeral: true
        });
    }
}