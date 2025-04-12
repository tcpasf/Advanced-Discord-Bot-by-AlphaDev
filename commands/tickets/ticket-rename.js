const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { tickets } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-rename')
        .setDescription('Rename a ticket channel')
        .addStringOption(option => 
            option.setName('name')
                .setDescription('The new name for the ticket channel')
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
        
        // Check if the user has permission to rename the ticket
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageChannels])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Channels permission to rename tickets.')],
                ephemeral: true
            });
        }
        
        const newName = interaction.options.getString('name');
        
        // Ensure the name starts with "ticket-"
        let channelName = newName;
        if (!channelName.startsWith('ticket-')) {
            channelName = `ticket-${ticket.number}-${channelName}`;
        }
        
        // Ensure the name is valid for Discord (lowercase, no spaces, etc.)
        channelName = channelName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        
        try {
            await interaction.channel.setName(channelName);
            
            const embed = createSuccessEmbed(
                'Ticket Renamed',
                `This ticket has been renamed to \`${channelName}\`.`
            )
            .addFields(
                { name: 'Ticket', value: `#${ticket.number}`, inline: true },
                { name: 'Renamed By', value: `${interaction.user}`, inline: true }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            // Log the ticket rename
            const guildSettings = tickets.getSettings(interaction.guild.id);
            
            if (guildSettings.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                
                if (logChannel) {
                    const logEmbed = createInfoEmbed(
                        'Ticket Renamed',
                        `Ticket #${ticket.number} has been renamed.`
                    )
                    .addFields(
                        { name: 'Ticket', value: `#${ticket.number} (${interaction.channel})`, inline: true },
                        { name: 'New Name', value: channelName, inline: true },
                        { name: 'Renamed By', value: `${interaction.user} (${interaction.user.id})`, inline: true }
                    )
                    .setFooter({ text: `Ticket ID: ${ticket.id}` });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error('Error renaming ticket:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while renaming the ticket.')],
                ephemeral: true
            });
        }
    }
};