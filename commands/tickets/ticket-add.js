const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { tickets } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-add')
        .setDescription('Add a user to a ticket')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to add to the ticket')
                .setRequired(true))
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
        
        // Check if the user has permission to add users to the ticket
        const isStaff = checkPermissions(interaction, [PermissionFlagsBits.ManageChannels]);
        const isTicketCreator = interaction.user.id === ticket.userId;
        
        if (!isStaff && !isTicketCreator) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You do not have permission to add users to this ticket.')],
                ephemeral: true
            });
        }
        
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'User not found in this server.')],
                ephemeral: true
            });
        }
        
        // Check if the user is already in the ticket
        if (interaction.channel.permissionsFor(member).has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', `${member} already has access to this ticket.`)],
                ephemeral: true
            });
        }
        
        try {
            // Add the user to the ticket
            await interaction.channel.permissionOverwrites.create(member, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true
            });
            
            // Update the ticket in the database
            const participants = ticket.participants || [];
            if (!participants.includes(member.id)) {
                participants.push(member.id);
                tickets.updateTicket(interaction.guild.id, ticket.id, { participants });
            }
            
            const embed = createSuccessEmbed(
                'User Added to Ticket',
                `${member} has been added to this ticket.`
            )
            .addFields(
                { name: 'Ticket', value: `#${ticket.number}`, inline: true },
                { name: 'Added By', value: `${interaction.user}`, inline: true }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            // Log the user addition
            const guildSettings = tickets.getSettings(interaction.guild.id);
            
            if (guildSettings.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                
                if (logChannel) {
                    const logEmbed = createInfoEmbed(
                        'User Added to Ticket',
                        `A user has been added to ticket #${ticket.number}.`
                    )
                    .addFields(
                        { name: 'Ticket', value: `#${ticket.number} (${interaction.channel})`, inline: true },
                        { name: 'User Added', value: `${member} (${member.id})`, inline: true },
                        { name: 'Added By', value: `${interaction.user} (${interaction.user.id})`, inline: true }
                    )
                    .setFooter({ text: `Ticket ID: ${ticket.id}` });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error('Error adding user to ticket:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while adding the user to the ticket.')],
                ephemeral: true
            });
        }
    }
};