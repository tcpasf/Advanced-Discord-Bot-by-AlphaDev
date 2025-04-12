const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { tickets } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-remove')
        .setDescription('Remove a user from a ticket')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to remove from the ticket')
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
        
        // Check if the user has permission to remove users from the ticket
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageChannels])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Channels permission to remove users from tickets.')],
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
        
        // Cannot remove the ticket creator
        if (user.id === ticket.userId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot remove the ticket creator from the ticket.')],
                ephemeral: true
            });
        }
        
        // Check if the user is in the ticket
        if (!interaction.channel.permissionsFor(member).has(PermissionFlagsBits.ViewChannel)) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', `${member} does not have access to this ticket.`)],
                ephemeral: true
            });
        }
        
        try {
            // Remove the user from the ticket
            await interaction.channel.permissionOverwrites.delete(member);
            
            // Update the ticket in the database
            let participants = ticket.participants || [];
            participants = participants.filter(id => id !== member.id);
            tickets.updateTicket(interaction.guild.id, ticket.id, { participants });
            
            const embed = createSuccessEmbed(
                'User Removed from Ticket',
                `${member} has been removed from this ticket.`
            )
            .addFields(
                { name: 'Ticket', value: `#${ticket.number}`, inline: true },
                { name: 'Removed By', value: `${interaction.user}`, inline: true }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            // Log the user removal
            const guildSettings = tickets.getSettings(interaction.guild.id);
            
            if (guildSettings.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                
                if (logChannel) {
                    const logEmbed = createInfoEmbed(
                        'User Removed from Ticket',
                        `A user has been removed from ticket #${ticket.number}.`
                    )
                    .addFields(
                        { name: 'Ticket', value: `#${ticket.number} (${interaction.channel})`, inline: true },
                        { name: 'User Removed', value: `${member} (${member.id})`, inline: true },
                        { name: 'Removed By', value: `${interaction.user} (${interaction.user.id})`, inline: true }
                    )
                    .setFooter({ text: `Ticket ID: ${ticket.id}` });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error('Error removing user from ticket:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while removing the user from the ticket.')],
                ephemeral: true
            });
        }
    }
};