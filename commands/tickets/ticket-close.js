const { SlashCommandBuilder, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { tickets } = require('../../utils/database');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-close')
        .setDescription('Close a ticket')
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for closing the ticket')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        // Check if the channel is a ticket
        const ticket = tickets.getTicketByChannelId(interaction.guild.id, interaction.channel.id);
        
        if (!ticket) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'This command can only be used in a ticket channel.')],
                ephemeral: true
            });
        }
        
        // Check if the user has permission to close the ticket
        const isStaff = checkPermissions(interaction, [PermissionFlagsBits.ManageChannels]);
        const isTicketCreator = interaction.user.id === ticket.userId;
        
        if (!isStaff && !isTicketCreator) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You do not have permission to close this ticket.')],
                ephemeral: true
            });
        }
        
        // If a reason was provided, close the ticket directly
        const reason = interaction.options.getString('reason');
        
        if (reason) {
            await closeTicket(interaction, ticket, reason);
        } else {
            // Otherwise, show a modal to get the reason
            const modal = new ModalBuilder()
                .setCustomId(`ticket_close_modal_${ticket.id}`)
                .setTitle('Close Ticket');
            
            const reasonInput = new TextInputBuilder()
                .setCustomId('closeReason')
                .setLabel('Reason for closing the ticket')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter the reason for closing this ticket...')
                .setRequired(true)
                .setMaxLength(1000);
            
            const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(firstActionRow);
            
            await interaction.showModal(modal);
        }
    },
    
    async handleButton(interaction) {
        if (interaction.customId === 'ticket_close') {
            // Check if the channel is a ticket
            const ticket = tickets.getTicketByChannelId(interaction.guild.id, interaction.channel.id);
            
            if (!ticket) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'This channel is not a ticket.')],
                    ephemeral: true
                });
            }
            
            // Show the close modal
            const modal = new ModalBuilder()
                .setCustomId(`ticket_close_modal_${ticket.id}`)
                .setTitle('Close Ticket');
            
            const reasonInput = new TextInputBuilder()
                .setCustomId('closeReason')
                .setLabel('Reason for closing the ticket')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Enter the reason for closing this ticket...')
                .setRequired(true)
                .setMaxLength(1000);
            
            const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(firstActionRow);
            
            await interaction.showModal(modal);
        } else if (interaction.customId === 'ticket_transcript') {
            // Check if the channel is a ticket
            const ticket = tickets.getTicketByChannelId(interaction.guild.id, interaction.channel.id);
            
            if (!ticket) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'This channel is not a ticket.')],
                    ephemeral: true
                });
            }
            
            await createTranscript(interaction, ticket);
        }
    },
    
    async handleModalSubmit(interaction) {
        if (interaction.customId.startsWith('ticket_close_modal_')) {
            const ticketId = interaction.customId.replace('ticket_close_modal_', '');
            const reason = interaction.fields.getTextInputValue('closeReason');
            
            // Get the ticket
            const ticket = tickets.getTicketById(interaction.guild.id, ticketId);
            
            if (!ticket) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'This ticket no longer exists.')],
                    ephemeral: true
                });
            }
            
            await closeTicket(interaction, ticket, reason);
        }
    }
};

async function closeTicket(interaction, ticket, reason) {
    try {
        // Create a transcript first
        await createTranscript(interaction, ticket, true);
        
        // Mark the ticket as closed in the database
        tickets.updateTicket(interaction.guild.id, ticket.id, { 
            closed: true,
            closedBy: interaction.user.id,
            closedAt: Date.now(),
            closeReason: reason
        });
        
        // Get ticket settings
        const guildSettings = tickets.getSettings(interaction.guild.id);
        
        // Move the channel to the closed category if it exists
        if (guildSettings.closedCategory) {
            await interaction.channel.setParent(guildSettings.closedCategory, {
                lockPermissions: false
            });
        }
        
        // Send a message in the ticket channel
        const embed = createSuccessEmbed(
            'Ticket Closed',
            `This ticket has been closed by ${interaction.user}.`
        )
        .addFields(
            { name: 'Reason', value: reason },
            { name: 'Ticket', value: `#${ticket.number}`, inline: true },
            { name: 'Closed By', value: `${interaction.user} (${interaction.user.id})`, inline: true }
        )
        .setFooter({ text: `Ticket ID: ${ticket.id}` });
        
        await interaction.reply({ embeds: [embed] });
        
        // Log the ticket closure
        if (guildSettings.logChannel) {
            const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
            
            if (logChannel) {
                const logEmbed = createInfoEmbed(
                    'Ticket Closed',
                    `Ticket #${ticket.number} has been closed.`
                )
                .addFields(
                    { name: 'Ticket', value: `#${ticket.number} (${interaction.channel})`, inline: true },
                    { name: 'User', value: `<@${ticket.userId}> (${ticket.userId})`, inline: true },
                    { name: 'Closed By', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                    { name: 'Reason', value: reason }
                )
                .setFooter({ text: `Ticket ID: ${ticket.id}` });
                
                await logChannel.send({ embeds: [logEmbed] });
            }
        }
        
        // Notify the ticket creator if they're not the one closing it
        if (ticket.userId !== interaction.user.id) {
            try {
                const ticketCreator = await interaction.client.users.fetch(ticket.userId);
                
                await ticketCreator.send({ 
                    embeds: [createInfoEmbed(
                        `Your Ticket Has Been Closed`,
                        `Your ticket in ${interaction.guild.name} has been closed by ${interaction.user.tag}.`
                    )
                    .addFields(
                        { name: 'Ticket', value: `#${ticket.number}`, inline: true },
                        { name: 'Reason', value: reason }
                    )]
                });
            } catch (error) {
                console.error('Could not DM ticket creator about closure:', error);
            }
        }
    } catch (error) {
        console.error('Error closing ticket:', error);
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while closing the ticket.')],
                ephemeral: true
            });
        } else {
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while closing the ticket.')],
                ephemeral: true
            });
        }
    }
}

async function createTranscript(interaction, ticket, isClosing = false) {
    try {
        await interaction.deferReply({ ephemeral: !isClosing });
        
        // Get all messages in the channel
        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        
        // Sort messages by timestamp (oldest first)
        const sortedMessages = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);
        
        // Create transcript content
        let transcriptContent = `# Ticket Transcript\n\n`;
        transcriptContent += `**Ticket:** #${ticket.number}\n`;
        transcriptContent += `**Created By:** ${(await interaction.client.users.fetch(ticket.userId)).tag} (${ticket.userId})\n`;
        transcriptContent += `**Created At:** ${new Date(ticket.createdAt).toLocaleString()}\n\n`;
        
        if (ticket.closed) {
            transcriptContent += `**Closed By:** ${(await interaction.client.users.fetch(ticket.closedBy)).tag} (${ticket.closedBy})\n`;
            transcriptContent += `**Closed At:** ${new Date(ticket.closedAt).toLocaleString()}\n`;
            transcriptContent += `**Reason:** ${ticket.closeReason}\n\n`;
        }
        
        transcriptContent += `## Messages\n\n`;
        
        for (const message of sortedMessages) {
            const timestamp = new Date(message.createdTimestamp).toLocaleString();
            transcriptContent += `**${message.author.tag}** (${timestamp}):\n`;
            transcriptContent += `${message.content || '(No content)'}\n`;
            
            if (message.attachments.size > 0) {
                transcriptContent += `**Attachments:**\n`;
                message.attachments.forEach(attachment => {
                    transcriptContent += `- ${attachment.name}: ${attachment.url}\n`;
                });
            }
            
            if (message.embeds.length > 0) {
                transcriptContent += `**Embeds:** ${message.embeds.length}\n`;
            }
            
            transcriptContent += `\n`;
        }
        
        // Get ticket settings
        const guildSettings = tickets.getSettings(interaction.guild.id);
        
        // Create a transcript channel if needed
        let transcriptChannel;
        
        if (guildSettings.transcriptCategory) {
            const transcriptChannelName = `transcript-${ticket.number}`;
            
            transcriptChannel = await interaction.guild.channels.create({
                name: transcriptChannelName,
                type: ChannelType.GuildText,
                parent: guildSettings.transcriptCategory,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.client.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });
            
            // Add permissions for staff roles
            if (guildSettings.supportRoles) {
                for (const roleId of guildSettings.supportRoles) {
                    await transcriptChannel.permissionOverwrites.create(roleId, {
                        ViewChannel: true,
                        SendMessages: false,
                        ReadMessageHistory: true
                    });
                }
            }
            
            // Add permission for the ticket creator
            await transcriptChannel.permissionOverwrites.create(ticket.userId, {
                ViewChannel: true,
                SendMessages: false,
                ReadMessageHistory: true
            });
            
            // Send the transcript to the channel
            const embed = createInfoEmbed(
                `Transcript for Ticket #${ticket.number}`,
                `This is a transcript of ticket #${ticket.number}.`
            )
            .addFields(
                { name: 'Created By', value: `<@${ticket.userId}> (${ticket.userId})`, inline: true },
                { name: 'Created At', value: `<t:${Math.floor(ticket.createdAt / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: `Ticket ID: ${ticket.id}` });
            
            if (ticket.closed) {
                embed.addFields(
                    { name: 'Closed By', value: `<@${ticket.closedBy}> (${ticket.closedBy})`, inline: true },
                    { name: 'Closed At', value: `<t:${Math.floor(ticket.closedAt / 1000)}:F>`, inline: true },
                    { name: 'Reason', value: ticket.closeReason }
                );
            }
            
            await transcriptChannel.send({ embeds: [embed] });
            
            // Create a file with the transcript
            const transcriptDir = path.join(process.cwd(), 'data', 'transcripts');
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(transcriptDir)) {
                fs.mkdirSync(transcriptDir, { recursive: true });
            }
            
            const transcriptPath = path.join(transcriptDir, `ticket-${ticket.number}.md`);
            fs.writeFileSync(transcriptPath, transcriptContent);
            
            // Send the transcript file
            await transcriptChannel.send({ 
                content: 'Full transcript:',
                files: [{ attachment: transcriptPath, name: `ticket-${ticket.number}.md` }]
            });
            
            // Update the ticket with the transcript channel ID
            tickets.updateTicket(interaction.guild.id, ticket.id, { transcriptChannelId: transcriptChannel.id });
            
            // Reply to the user
            const replyEmbed = createSuccessEmbed(
                'Transcript Created',
                `A transcript has been created for this ticket.`
            )
            .addFields({ name: 'Transcript Channel', value: `${transcriptChannel}` });
            
            await interaction.editReply({ embeds: [replyEmbed], ephemeral: !isClosing });
            
            // Log the transcript creation
            if (guildSettings.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                
                if (logChannel) {
                    const logEmbed = createInfoEmbed(
                        'Ticket Transcript Created',
                        `A transcript has been created for ticket #${ticket.number}.`
                    )
                    .addFields(
                        { name: 'Ticket', value: `#${ticket.number} (${interaction.channel})`, inline: true },
                        { name: 'User', value: `<@${ticket.userId}> (${ticket.userId})`, inline: true },
                        { name: 'Created By', value: `${interaction.user} (${interaction.user.id})`, inline: true },
                        { name: 'Transcript', value: `${transcriptChannel}` }
                    )
                    .setFooter({ text: `Ticket ID: ${ticket.id}` });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } else {
            // If no transcript category is set, just create the file and send it to the current channel
            const transcriptDir = path.join(process.cwd(), 'data', 'transcripts');
            
            // Create directory if it doesn't exist
            if (!fs.existsSync(transcriptDir)) {
                fs.mkdirSync(transcriptDir, { recursive: true });
            }
            
            const transcriptPath = path.join(transcriptDir, `ticket-${ticket.number}.md`);
            fs.writeFileSync(transcriptPath, transcriptContent);
            
            // Send the transcript file
            await interaction.channel.send({ 
                content: 'Ticket transcript:',
                files: [{ attachment: transcriptPath, name: `ticket-${ticket.number}.md` }]
            });
            
            // Reply to the user
            const replyEmbed = createSuccessEmbed(
                'Transcript Created',
                `A transcript has been created for this ticket.`
            );
            
            await interaction.editReply({ embeds: [replyEmbed], ephemeral: !isClosing });
        }
    } catch (error) {
        console.error('Error creating transcript:', error);
        
        await interaction.editReply({ 
            embeds: [createErrorEmbed('Error', 'An error occurred while creating the transcript.')],
            ephemeral: !isClosing
        });
    }
}