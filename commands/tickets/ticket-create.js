const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { tickets } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-create')
        .setDescription('Create a new support ticket')
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for creating the ticket')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            // Check if user is blacklisted
            const isBlacklisted = tickets.isBlacklisted(interaction.guild.id, interaction.user.id);
            
            if (isBlacklisted) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Blacklisted', 'You are blacklisted from creating tickets.')],
                    ephemeral: true
                });
            }
            
            // Check if user already has an open ticket
            const userTickets = tickets.getUserTickets(interaction.guild.id, interaction.user.id);
            
            if (userTickets.length > 0) {
                const openTickets = userTickets.filter(ticket => !ticket.closed);
                
                if (openTickets.length > 0) {
                    const ticketChannel = interaction.guild.channels.cache.get(openTickets[0].channelId);
                    
                    if (ticketChannel) {
                        return interaction.reply({ 
                            embeds: [createErrorEmbed('Ticket Exists', `You already have an open ticket: ${ticketChannel}`)],
                            ephemeral: true
                        });
                    }
                }
            }
            
            // Get ticket settings
            const guildSettings = tickets.getSettings(interaction.guild.id);
            
            if (!guildSettings.openCategory) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Setup Required', 'The ticket system has not been set up properly. Please contact an administrator.')],
                    ephemeral: true
                });
            }
            
            // Get reason from command option
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            // Show ticket category selection
            await showTicketCategorySelection(interaction, reason);
        } catch (error) {
            console.error('Error creating ticket:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while creating the ticket.')],
                ephemeral: true
            });
        }
    },
    
    async handleButton(interaction) {
        // Handle all ticket creation buttons with different categories
        if (interaction.customId.startsWith('ticket_create_')) {
            try {
                const category = interaction.customId.split('_')[2];
                
                // Show ticket creation modal
                const modal = new ModalBuilder()
                    .setCustomId('ticket_create_modal')
                    .setTitle('Create a Support Ticket');
                
                // Set different placeholder based on category
                let placeholder = 'Please describe your issue or question...';
                let label = 'What do you need help with?';
                
                if (category === 'general') {
                    placeholder = 'Describe your general question or issue';
                    label = 'General Support Request';
                } else if (category === 'report') {
                    placeholder = 'Who are you reporting and what rule did they break?';
                    label = 'User Report Details';
                } else if (category === 'technical') {
                    placeholder = 'Describe the technical issue you\'re experiencing';
                    label = 'Technical Issue Details';
                } else if (category === 'suggestion') {
                    placeholder = 'Describe your suggestion for the server';
                    label = 'Suggestion Details';
                } else if (category === 'staff') {
                    placeholder = 'What do you need to discuss with the staff team?';
                    label = 'Staff Contact Reason';
                }
                
                const reasonInput = new TextInputBuilder()
                    .setCustomId('ticket_reason')
                    .setLabel(label)
                    .setPlaceholder(placeholder)
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(1000);
                
                const firstRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(firstRow);
                
                // Store the category in temporary data
                tickets.setTemporaryTicketData(interaction.user.id, { category });
                
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing ticket modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your ticket request.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId === 'ticket_create') {
            // Legacy button support
            try {
                const modal = new ModalBuilder()
                    .setCustomId('ticket_create_modal')
                    .setTitle('Create a Support Ticket');
                
                const reasonInput = new TextInputBuilder()
                    .setCustomId('ticket_reason')
                    .setLabel('What do you need help with?')
                    .setPlaceholder('Please describe your issue or question...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMinLength(10)
                    .setMaxLength(1000);
                
                const firstRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(firstRow);
                
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing ticket modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your ticket request.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId.startsWith('ticket_add_')) {
            try {
                // Extract ticket ID from the button custom ID
                const ticketId = interaction.customId.split('_')[2];
                
                // Create a modal for adding a user
                const modal = new ModalBuilder()
                    .setCustomId(`ticket_add_modal_${ticketId}`)
                    .setTitle('Add User to Ticket');
                
                const userIdInput = new TextInputBuilder()
                    .setCustomId('user_id')
                    .setLabel('User ID or @Mention')
                    .setPlaceholder('Enter the user ID or @mention the user')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(2)
                    .setMaxLength(100);
                
                const reasonInput = new TextInputBuilder()
                    .setCustomId('reason')
                    .setLabel('Reason (Optional)')
                    .setPlaceholder('Why are you adding this user?')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(100);
                
                const firstRow = new ActionRowBuilder().addComponents(userIdInput);
                const secondRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(firstRow, secondRow);
                
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing add user modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your request.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId.startsWith('ticket_remove_')) {
            try {
                // Extract ticket ID from the button custom ID
                const ticketId = interaction.customId.split('_')[2];
                
                // Create a modal for removing a user
                const modal = new ModalBuilder()
                    .setCustomId(`ticket_remove_modal_${ticketId}`)
                    .setTitle('Remove User from Ticket');
                
                const userIdInput = new TextInputBuilder()
                    .setCustomId('user_id')
                    .setLabel('User ID or @Mention')
                    .setPlaceholder('Enter the user ID or @mention the user')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(2)
                    .setMaxLength(100);
                
                const reasonInput = new TextInputBuilder()
                    .setCustomId('reason')
                    .setLabel('Reason (Optional)')
                    .setPlaceholder('Why are you removing this user?')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
                    .setMaxLength(100);
                
                const firstRow = new ActionRowBuilder().addComponents(userIdInput);
                const secondRow = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(firstRow, secondRow);
                
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing remove user modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your request.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId.startsWith('ticket_priority_')) {
            try {
                // Extract ticket ID from the button custom ID
                const ticketId = interaction.customId.split('_')[2];
                
                // Create a select menu for changing priority
                const row = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId(`ticket_priority_select_${ticketId}`)
                            .setPlaceholder('Select a priority level')
                            .addOptions([
                                {
                                    label: 'Low Priority',
                                    description: 'Non-urgent issues that can wait',
                                    value: 'low',
                                    emoji: '🟢'
                                },
                                {
                                    label: 'Medium Priority',
                                    description: 'Issues that need attention soon',
                                    value: 'medium',
                                    emoji: '🟡'
                                },
                                {
                                    label: 'High Priority',
                                    description: 'Urgent issues requiring immediate attention',
                                    value: 'high',
                                    emoji: '🔴'
                                }
                            ])
                    );
                
                await interaction.reply({
                    content: 'Please select a new priority level for this ticket:',
                    components: [row],
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error showing priority selection:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your request.')],
                    ephemeral: true
                });
            }
        }
    },
    
    async handleModalSubmit(interaction) {
        if (interaction.customId === 'ticket_create_modal') {
            try {
                // Get reason from modal
                const reason = interaction.fields.getTextInputValue('ticket_reason');
                
                // Show ticket category selection
                await showTicketCategorySelection(interaction, reason);
            } catch (error) {
                console.error('Error processing ticket modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your ticket request.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId === 'ticket_priority_modal') {
            try {
                // Get details from modal
                const subject = interaction.fields.getTextInputValue('ticket_subject');
                const details = interaction.fields.getTextInputValue('ticket_details');
                
                // Get stored data from the interaction
                const userData = tickets.getTemporaryTicketData(interaction.user.id);
                
                if (!userData) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Your ticket session has expired. Please try creating a ticket again.')],
                        ephemeral: true
                    });
                }
                
                // Create the ticket
                await createTicket(interaction, {
                    category: userData.category,
                    reason: userData.reason,
                    subject,
                    details,
                    priority: userData.priority
                });
                
                // Clear temporary data
                tickets.clearTemporaryTicketData(interaction.user.id);
            } catch (error) {
                console.error('Error processing ticket details modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your ticket details.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId.startsWith('ticket_add_modal_')) {
            try {
                // Extract ticket ID from the modal custom ID
                const ticketId = interaction.customId.split('_')[3];
                
                // Get user ID and reason from modal
                const userIdInput = interaction.fields.getTextInputValue('user_id');
                const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';
                
                // Extract user ID from mention or use as is
                let userId = userIdInput.replace(/[<@!>]/g, '');
                
                // Get ticket data
                const ticketData = tickets.getTicket(ticketId);
                
                if (!ticketData) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Ticket not found.')],
                        ephemeral: true
                    });
                }
                
                // Get the channel
                const channel = interaction.guild.channels.cache.get(ticketData.channelId);
                
                if (!channel) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Ticket channel not found.')],
                        ephemeral: true
                    });
                }
                
                // Try to fetch the user
                try {
                    const user = await interaction.client.users.fetch(userId);
                    
                    // Add user to the channel
                    await channel.permissionOverwrites.create(user.id, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });
                    
                    // Send confirmation
                    await interaction.reply({ 
                        embeds: [createSuccessEmbed('User Added', `Added ${user} to the ticket.\nReason: ${reason}`)],
                        ephemeral: true
                    });
                    
                    // Notify in the ticket channel
                    await channel.send({ 
                        embeds: [createInfoEmbed('User Added', `${user} has been added to this ticket by ${interaction.user}.\nReason: ${reason}`)]
                    });
                } catch (error) {
                    console.error('Error adding user to ticket:', error);
                    
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Could not find a user with that ID. Please make sure you entered a valid user ID or mention.')],
                        ephemeral: true
                    });
                }
            } catch (error) {
                console.error('Error processing add user modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your request.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId.startsWith('ticket_remove_modal_')) {
            try {
                // Extract ticket ID from the modal custom ID
                const ticketId = interaction.customId.split('_')[3];
                
                // Get user ID and reason from modal
                const userIdInput = interaction.fields.getTextInputValue('user_id');
                const reason = interaction.fields.getTextInputValue('reason') || 'No reason provided';
                
                // Extract user ID from mention or use as is
                let userId = userIdInput.replace(/[<@!>]/g, '');
                
                // Get ticket data
                const ticketData = tickets.getTicket(ticketId);
                
                if (!ticketData) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Ticket not found.')],
                        ephemeral: true
                    });
                }
                
                // Get the channel
                const channel = interaction.guild.channels.cache.get(ticketData.channelId);
                
                if (!channel) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Ticket channel not found.')],
                        ephemeral: true
                    });
                }
                
                // Don't allow removing the ticket creator
                if (userId === ticketData.userId) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'You cannot remove the ticket creator.')],
                        ephemeral: true
                    });
                }
                
                // Try to fetch the user
                try {
                    const user = await interaction.client.users.fetch(userId);
                    
                    // Remove user from the channel
                    await channel.permissionOverwrites.delete(user.id);
                    
                    // Send confirmation
                    await interaction.reply({ 
                        embeds: [createSuccessEmbed('User Removed', `Removed ${user} from the ticket.\nReason: ${reason}`)],
                        ephemeral: true
                    });
                    
                    // Notify in the ticket channel
                    await channel.send({ 
                        embeds: [createInfoEmbed('User Removed', `${user} has been removed from this ticket by ${interaction.user}.\nReason: ${reason}`)]
                    });
                } catch (error) {
                    console.error('Error removing user from ticket:', error);
                    
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Could not find a user with that ID. Please make sure you entered a valid user ID or mention.')],
                        ephemeral: true
                    });
                }
            } catch (error) {
                console.error('Error processing remove user modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your request.')],
                    ephemeral: true
                });
            }
        }
    },
    
    async handleSelectMenu(interaction) {
        if (interaction.customId === 'ticket_category_select') {
            try {
                const category = interaction.values[0];
                const userData = tickets.getTemporaryTicketData(interaction.user.id);
                
                if (!userData) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Your ticket session has expired. Please try creating a ticket again.')],
                        ephemeral: true
                    });
                }
                
                // Update the stored data
                tickets.updateTemporaryTicketData(interaction.user.id, {
                    ...userData,
                    category
                });
                
                // Show priority selection
                await showPrioritySelection(interaction, category, userData.reason);
            } catch (error) {
                console.error('Error processing category selection:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your category selection.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId === 'ticket_priority_select') {
            try {
                const priority = interaction.values[0];
                const userData = tickets.getTemporaryTicketData(interaction.user.id);
                
                if (!userData) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Your ticket session has expired. Please try creating a ticket again.')],
                        ephemeral: true
                    });
                }
                
                // Update the stored data
                tickets.updateTemporaryTicketData(interaction.user.id, {
                    ...userData,
                    priority
                });
                
                // Open the details modal
                const modal = new ModalBuilder()
                    .setCustomId('ticket_priority_modal')
                    .setTitle('Ticket Details');
                
                const subjectInput = new TextInputBuilder()
                    .setCustomId('ticket_subject')
                    .setLabel('Subject')
                    .setPlaceholder('Brief subject for your ticket')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(5)
                    .setMaxLength(100);
                
                const detailsInput = new TextInputBuilder()
                    .setCustomId('ticket_details')
                    .setLabel('Details')
                    .setPlaceholder('Please provide more details about your issue...')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                    .setMinLength(20)
                    .setMaxLength(1000);
                
                const firstRow = new ActionRowBuilder().addComponents(subjectInput);
                const secondRow = new ActionRowBuilder().addComponents(detailsInput);
                modal.addComponents(firstRow, secondRow);
                
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error processing priority selection:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while processing your priority selection.')],
                    ephemeral: true
                });
            }
        } else if (interaction.customId.startsWith('ticket_priority_select_')) {
            try {
                // Extract ticket ID from the select menu custom ID
                const ticketId = interaction.customId.split('_')[3];
                const priority = interaction.values[0];
                
                // Get ticket data
                const ticketData = tickets.getTicket(ticketId);
                
                if (!ticketData) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Ticket not found.')],
                        ephemeral: true
                    });
                }
                
                // Get the channel
                const channel = interaction.guild.channels.cache.get(ticketData.channelId);
                
                if (!channel) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Ticket channel not found.')],
                        ephemeral: true
                    });
                }
                
                // Update ticket priority
                tickets.updateTicket(ticketId, {
                    ...ticketData,
                    priority
                });
                
                // Priority colors and emojis
                const priorityColors = {
                    'low': '#00FF00',
                    'medium': '#FFFF00',
                    'high': '#FF0000'
                };
                
                const priorityEmojis = {
                    'low': '🟢',
                    'medium': '🟡',
                    'high': '🔴'
                };
                
                // Send confirmation
                await interaction.reply({ 
                    embeds: [createSuccessEmbed(
                        'Priority Updated', 
                        `Ticket priority has been updated to ${priorityEmojis[priority] || '⚪'} ${priority.charAt(0).toUpperCase() + priority.slice(1)}`
                    )],
                    ephemeral: true
                });
                
                // Notify in the ticket channel
                await channel.send({ 
                    embeds: [createInfoEmbed(
                        'Priority Updated', 
                        `${interaction.user} has updated the ticket priority to ${priorityEmojis[priority] || '⚪'} ${priority.charAt(0).toUpperCase() + priority.slice(1)}`
                    )]
                });
                
                // Update the first message in the channel if possible
                try {
                    const messages = await channel.messages.fetch({ limit: 10 });
                    const firstMessage = messages.last();
                    
                    if (firstMessage && firstMessage.embeds.length > 0) {
                        const oldEmbed = firstMessage.embeds[0];
                        const newEmbed = EmbedBuilder.from(oldEmbed)
                            .setColor(priorityColors[priority] || '#7289DA');
                        
                        // Update the priority field if it exists
                        if (oldEmbed.fields) {
                            const priorityFieldIndex = oldEmbed.fields.findIndex(field => field.name === 'Priority');
                            
                            if (priorityFieldIndex !== -1) {
                                newEmbed.spliceFields(priorityFieldIndex, 1, {
                                    name: 'Priority',
                                    value: `${priorityEmojis[priority] || '⚪'} ${priority.charAt(0).toUpperCase() + priority.slice(1)}`,
                                    inline: true
                                });
                            }
                        }
                        
                        await firstMessage.edit({ embeds: [newEmbed] });
                    }
                } catch (error) {
                    console.error('Error updating ticket embed:', error);
                    // Continue even if updating the embed fails
                }
            } catch (error) {
                console.error('Error updating ticket priority:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while updating the ticket priority.')],
                    ephemeral: true
                });
            }
        }
    }
};

async function showTicketCategorySelection(interaction, reason) {
    // Get existing data if any
    const existingData = tickets.getTemporaryTicketData(interaction.user.id) || {};
    
    // Store the reason temporarily and keep any existing data
    tickets.setTemporaryTicketData(interaction.user.id, { 
        ...existingData,
        reason 
    });
    
    // If category is already selected (from button), skip to priority selection
    if (existingData.category) {
        return showPrioritySelection(interaction, existingData.category, reason);
    }
    
    const embed = createInfoEmbed(
        '🎫 Create a Support Ticket',
        'Please select a category for your ticket:'
    )
    .addFields(
        { name: 'Your Reason', value: reason }
    );
    
    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_category_select')
                .setPlaceholder('Select a category')
                .addOptions([
                    {
                        label: 'General Support',
                        description: 'General questions and assistance',
                        value: 'general',
                        emoji: '❓'
                    },
                    {
                        label: 'Technical Support',
                        description: 'Technical issues and bugs',
                        value: 'technical',
                        emoji: '🔧'
                    },
                    {
                        label: 'Account Issues',
                        description: 'Problems with your account',
                        value: 'account',
                        emoji: '👤'
                    },
                    {
                        label: 'Billing & Payments',
                        description: 'Questions about billing or payments',
                        value: 'billing',
                        emoji: '💰'
                    },
                    {
                        label: 'Report User',
                        description: 'Report a user for breaking rules',
                        value: 'report',
                        emoji: '🚨'
                    },
                    {
                        label: 'Suggestion',
                        description: 'Ideas to improve the server or community',
                        value: 'suggestion',
                        emoji: '💡'
                    },
                    {
                        label: 'Contact Staff',
                        description: 'Private matters that require staff attention',
                        value: 'staff',
                        emoji: '👮'
                    },
                    {
                        label: 'Other',
                        description: 'Any other issues not covered by the categories above',
                        value: 'other',
                        emoji: '📋'
                    }
                ])
        );
    
    if (interaction.isModalSubmit()) {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    } else {
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }
}

async function showPrioritySelection(interaction, category, reason) {
    const categoryNames = {
        'general': 'General Support',
        'technical': 'Technical Support',
        'account': 'Account Issues',
        'billing': 'Billing & Payments',
        'report': 'Report User',
        'suggestion': 'Suggestion',
        'staff': 'Contact Staff',
        'other': 'Other'
    };
    
    const categoryEmojis = {
        'general': '❓',
        'technical': '🔧',
        'account': '👤',
        'billing': '💰',
        'report': '🚨',
        'suggestion': '💡',
        'staff': '👮',
        'other': '📋'
    };
    
    const embed = createInfoEmbed(
        '🎫 Create a Support Ticket',
        'Please select the priority level for your ticket:'
    )
    .addFields(
        { name: 'Category', value: `${categoryEmojis[category] || '📁'} ${categoryNames[category] || category}`, inline: true },
        { name: 'Reason', value: reason, inline: true }
    );
    
    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ticket_priority_select')
                .setPlaceholder('Select priority level')
                .addOptions([
                    {
                        label: 'Low Priority',
                        description: 'General questions, non-urgent issues',
                        value: 'low',
                        emoji: '🟢'
                    },
                    {
                        label: 'Medium Priority',
                        description: 'Important issues that need attention',
                        value: 'medium',
                        emoji: '🟡'
                    },
                    {
                        label: 'High Priority',
                        description: 'Urgent issues requiring immediate attention',
                        value: 'high',
                        emoji: '🔴'
                    }
                ])
        );
    
    await interaction.update({ embeds: [embed], components: [row], ephemeral: true });
}

async function createTicket(interaction, ticketData) {
    try {
        // Get ticket settings
        const guildSettings = tickets.getSettings(interaction.guild.id);
        
        if (!guildSettings.openCategory) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Setup Required', 'The ticket system has not been set up properly. Please contact an administrator.')],
                ephemeral: true
            });
        }
        
        // Generate ticket ID
        const ticketCount = tickets.getTicketCount(interaction.guild.id) + 1;
        const ticketId = `${ticketCount.toString().padStart(4, '0')}`;
        
        // Create ticket channel
        const channelName = `ticket-${ticketId}`;
        
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: guildSettings.openCategory,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ]
        });
        
        // Add support roles if configured
        if (guildSettings.supportRoles && guildSettings.supportRoles.length > 0) {
            for (const roleId of guildSettings.supportRoles) {
                await ticketChannel.permissionOverwrites.create(roleId, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });
            }
        }
        
        // Create ticket embed
        const priorityColors = {
            'low': '#00FF00',
            'medium': '#FFFF00',
            'high': '#FF0000'
        };
        
        const priorityEmojis = {
            'low': '🟢',
            'medium': '🟡',
            'high': '🔴'
        };
        
        const categoryNames = {
            'general': 'General Support',
            'technical': 'Technical Support',
            'account': 'Account Issues',
            'billing': 'Billing & Payments',
            'report': 'Report User'
        };
        
        const categoryEmojis = {
            'general': '❓',
            'technical': '🔧',
            'account': '👤',
            'billing': '💰',
            'report': '🚨'
        };
        
        const embed = new EmbedBuilder()
            .setColor(priorityColors[ticketData.priority] || '#7289DA')
            .setTitle(`Ticket #${ticketId}: ${ticketData.subject}`)
            .setDescription(ticketData.details)
            .addFields(
                { name: 'Category', value: `${categoryEmojis[ticketData.category] || '📁'} ${categoryNames[ticketData.category] || ticketData.category}`, inline: true },
                { name: 'Priority', value: `${priorityEmojis[ticketData.priority] || '⚪'} ${ticketData.priority.charAt(0).toUpperCase() + ticketData.priority.slice(1)}`, inline: true },
                { name: 'Created By', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                { name: 'Created At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: `Ticket ID: ${ticketId}` })
            .setTimestamp();
        
        // Create action buttons
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_close_${ticketId}`)
                    .setLabel('Close Ticket')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`ticket_claim_${ticketId}`)
                    .setLabel('Claim Ticket')
                    .setEmoji('👋')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`ticket_priority_${ticketId}`)
                    .setLabel('Change Priority')
                    .setEmoji('🔄')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_add_${ticketId}`)
                    .setLabel('Add User')
                    .setEmoji('➕')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`ticket_remove_${ticketId}`)
                    .setLabel('Remove User')
                    .setEmoji('➖')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`ticket_transcript_${ticketId}`)
                    .setLabel('Save Transcript')
                    .setEmoji('📝')
                    .setStyle(ButtonStyle.Secondary)
            );
        
        // Send welcome message
        await ticketChannel.send({ 
            content: `${interaction.user} Welcome to your ticket! Support staff will assist you shortly.`,
            embeds: [embed],
            components: [row1, row2]
        });
        
        // Store ticket in database
        const ticketDataToStore = {
            id: ticketId,
            channelId: ticketChannel.id,
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            subject: ticketData.subject,
            category: ticketData.category,
            priority: ticketData.priority,
            createdAt: Date.now(),
            closed: false,
            claimed: false,
            claimedBy: null
        };
        
        tickets.createTicket(ticketId, ticketDataToStore);
        tickets.incrementTicketCount(interaction.guild.id);
        
        // Send confirmation to user
        const confirmEmbed = createSuccessEmbed(
            'Ticket Created',
            `Your ticket has been created: ${ticketChannel}`
        )
        .addFields(
            { name: 'Ticket ID', value: `#${ticketId}`, inline: true },
            { name: 'Subject', value: ticketDataToStore.subject, inline: true }
        );
        
        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        
        // Log ticket creation
        if (guildSettings.logChannel) {
            const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
            
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('Ticket Created')
                    .addFields(
                        { name: 'Ticket ID', value: `#${ticketId}`, inline: true },
                        { name: 'Channel', value: `${ticketChannel} (${ticketChannel.id})`, inline: true },
                        { name: 'User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                        { name: 'Subject', value: ticketDataToStore.subject, inline: true },
                        { name: 'Category', value: `${categoryNames[ticketDataToStore.category] || ticketDataToStore.category}`, inline: true },
                        { name: 'Priority', value: `${ticketDataToStore.priority.charAt(0).toUpperCase() + ticketDataToStore.priority.slice(1)}`, inline: true }
                    )
                    .setFooter({ text: `User ID: ${interaction.user.id}` })
                    .setTimestamp();
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
    } catch (error) {
        console.error('Error creating ticket channel:', error);
        
        await interaction.reply({ 
            embeds: [createErrorEmbed('Error', 'An error occurred while creating the ticket channel.')],
            ephemeral: true
        });
    }
}