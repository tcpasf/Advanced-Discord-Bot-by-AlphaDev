const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { tickets } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Manage the ticket system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set up the ticket system')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send the ticket panel to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('title')
                        .setDescription('The title of the ticket panel')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('description')
                        .setDescription('The description of the ticket panel')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('button-text')
                        .setDescription('The text on the ticket button')
                        .setRequired(false))
                .addStringOption(option => 
                    option.setName('emoji')
                        .setDescription('The emoji to use on the ticket button')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-category')
                .setDescription('Set the categories for tickets')
                .addChannelOption(option => 
                    option.setName('open-category')
                        .setDescription('The category for open tickets')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('transcript-category')
                        .setDescription('The category for ticket transcripts')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false))
                .addChannelOption(option => 
                    option.setName('closed-category')
                        .setDescription('The category for closed tickets')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-log')
                .setDescription('Set the log channel for tickets')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send ticket logs to')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist')
                .setDescription('Manage the ticket blacklist')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to add/remove from the blacklist')
                        .setRequired(true))
                .addBooleanOption(option => 
                    option.setName('add')
                        .setDescription('Add the user to the blacklist (false to remove)')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('The reason for blacklisting the user')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const title = interaction.options.getString('title') || 'Support Tickets';
            const description = interaction.options.getString('description') || 
                'If you need assistance, click the button below to create a ticket. Our support team will help you as soon as possible.';
            const buttonText = interaction.options.getString('button-text') || 'Create Ticket';
            const emoji = interaction.options.getString('emoji') || '🎫';
            
            try {
                // Initialize ticket settings if they don't exist
                const guildSettings = tickets.getSettings(interaction.guild.id);
                
                if (!guildSettings.openCategory) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Setup Required', 'Please set up the ticket categories first using `/ticket set-category`.')],
                        ephemeral: true
                    });
                }
                
                if (!guildSettings.logChannel) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Setup Required', 'Please set up the log channel first using `/ticket set-log`.')],
                        ephemeral: true
                    });
                }
                
                const embed = createInfoEmbed(
                    title,
                    description
                )
                .setFooter({ text: `${interaction.guild.name} Support System` });
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_create')
                            .setLabel(buttonText)
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji(emoji)
                    );
                
                const message = await channel.send({ embeds: [embed], components: [row] });
                
                // Save the panel message ID
                tickets.updateSettings(interaction.guild.id, { panelMessageId: message.id, panelChannelId: channel.id });
                
                await interaction.reply({ 
                    embeds: [createSuccessEmbed('Ticket System Setup', `The ticket panel has been set up in ${channel}.`)],
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error setting up ticket system:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while setting up the ticket system.')],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'set-category') {
            const openCategory = interaction.options.getChannel('open-category');
            const transcriptCategory = interaction.options.getChannel('transcript-category');
            const closedCategory = interaction.options.getChannel('closed-category');
            
            try {
                const settings = {
                    openCategory: openCategory.id
                };
                
                if (transcriptCategory) {
                    settings.transcriptCategory = transcriptCategory.id;
                }
                
                if (closedCategory) {
                    settings.closedCategory = closedCategory.id;
                }
                
                tickets.updateSettings(interaction.guild.id, settings);
                
                const embed = createSuccessEmbed(
                    'Ticket Categories Set',
                    'The ticket categories have been updated.'
                )
                .addFields(
                    { name: 'Open Tickets Category', value: `${openCategory} (${openCategory.id})`, inline: true }
                );
                
                if (transcriptCategory) {
                    embed.addFields({ name: 'Transcript Category', value: `${transcriptCategory} (${transcriptCategory.id})`, inline: true });
                }
                
                if (closedCategory) {
                    embed.addFields({ name: 'Closed Tickets Category', value: `${closedCategory} (${closedCategory.id})`, inline: true });
                }
                
                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error setting ticket categories:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while setting the ticket categories.')],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'set-log') {
            const channel = interaction.options.getChannel('channel');
            
            try {
                tickets.updateSettings(interaction.guild.id, { logChannel: channel.id });
                
                const embed = createSuccessEmbed(
                    'Ticket Log Channel Set',
                    `The ticket log channel has been set to ${channel}.`
                );
                
                await interaction.reply({ embeds: [embed] });
                
                // Send a test log message
                const testEmbed = createInfoEmbed(
                    'Ticket Logs Initialized',
                    'This channel has been set as the ticket log channel. All ticket actions will be logged here.'
                )
                .setFooter({ text: `Set by ${interaction.user.tag}` });
                
                await channel.send({ embeds: [testEmbed] });
            } catch (error) {
                console.error('Error setting ticket log channel:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while setting the ticket log channel.')],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'blacklist') {
            const user = interaction.options.getUser('user');
            const add = interaction.options.getBoolean('add');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            
            try {
                if (add) {
                    tickets.blacklistUser(interaction.guild.id, user.id, reason, interaction.user.id);
                    
                    const embed = createSuccessEmbed(
                        'User Blacklisted',
                        `${user} has been blacklisted from creating tickets.`
                    )
                    .addFields(
                        { name: 'User', value: `${user} (${user.id})`, inline: true },
                        { name: 'Moderator', value: `${interaction.user}`, inline: true },
                        { name: 'Reason', value: reason }
                    );
                    
                    await interaction.reply({ embeds: [embed] });
                    
                    // Log to the ticket log channel
                    const guildSettings = tickets.getSettings(interaction.guild.id);
                    if (guildSettings.logChannel) {
                        const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                        if (logChannel) {
                            await logChannel.send({ embeds: [embed] });
                        }
                    }
                } else {
                    const removed = tickets.unblacklistUser(interaction.guild.id, user.id);
                    
                    if (!removed) {
                        return interaction.reply({ 
                            embeds: [createErrorEmbed('Error', 'This user is not blacklisted.')],
                            ephemeral: true
                        });
                    }
                    
                    const embed = createSuccessEmbed(
                        'User Removed from Blacklist',
                        `${user} has been removed from the ticket blacklist.`
                    )
                    .addFields(
                        { name: 'User', value: `${user} (${user.id})`, inline: true },
                        { name: 'Moderator', value: `${interaction.user}`, inline: true },
                        { name: 'Reason', value: reason }
                    );
                    
                    await interaction.reply({ embeds: [embed] });
                    
                    // Log to the ticket log channel
                    const guildSettings = tickets.getSettings(interaction.guild.id);
                    if (guildSettings.logChannel) {
                        const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                        if (logChannel) {
                            await logChannel.send({ embeds: [embed] });
                        }
                    }
                }
            } catch (error) {
                console.error('Error managing ticket blacklist:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while managing the ticket blacklist.')],
                    ephemeral: true
                });
            }
        }
    },
    
    async handleButton(interaction) {
        if (interaction.customId === 'ticket_create') {
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
                        embeds: [createErrorEmbed('Setup Required', 'The ticket system has not been fully set up yet.')],
                        ephemeral: true
                    });
                }
                
                // Create the ticket channel
                const ticketNumber = tickets.getNextTicketNumber(interaction.guild.id);
                const channelName = `ticket-${ticketNumber}-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
                
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
                        },
                        {
                            id: interaction.client.user.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
                        }
                    ]
                });
                
                // Add support roles if configured
                if (guildSettings.supportRoles) {
                    for (const roleId of guildSettings.supportRoles) {
                        await ticketChannel.permissionOverwrites.create(roleId, {
                            ViewChannel: true,
                            SendMessages: true,
                            ReadMessageHistory: true
                        });
                    }
                }
                
                // Create the ticket in the database
                const ticket = tickets.createTicket(interaction.guild.id, {
                    number: ticketNumber,
                    channelId: ticketChannel.id,
                    userId: interaction.user.id,
                    createdAt: Date.now(),
                    closed: false
                });
                
                // Send the initial message in the ticket channel
                const embed = createInfoEmbed(
                    `Ticket #${ticketNumber}`,
                    `Thank you for creating a ticket, ${interaction.user}. Please describe your issue and a staff member will assist you shortly.`
                )
                .setFooter({ text: `Ticket ID: ${ticket.id}` });
                
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('ticket_close')
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒'),
                        new ButtonBuilder()
                            .setCustomId('ticket_transcript')
                            .setLabel('Save Transcript')
                            .setStyle(ButtonStyle.Secondary)
                            .setEmoji('📑')
                    );
                
                await ticketChannel.send({ embeds: [embed], components: [row] });
                
                // Notify the user
                await interaction.reply({ 
                    embeds: [createSuccessEmbed('Ticket Created', `Your ticket has been created: ${ticketChannel}`)],
                    ephemeral: true
                });
                
                // Log the ticket creation
                if (guildSettings.logChannel) {
                    const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                    
                    if (logChannel) {
                        const logEmbed = createInfoEmbed(
                            'Ticket Created',
                            `A new ticket has been created by ${interaction.user}.`
                        )
                        .addFields(
                            { name: 'Ticket', value: `#${ticketNumber} (${ticketChannel})`, inline: true },
                            { name: 'User', value: `${interaction.user} (${interaction.user.id})`, inline: true }
                        )
                        .setFooter({ text: `Ticket ID: ${ticket.id}` });
                        
                        await logChannel.send({ embeds: [logEmbed] });
                    }
                }
            } catch (error) {
                console.error('Error creating ticket:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while creating the ticket.')],
                    ephemeral: true
                });
            }
        }
    }
};