const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { tickets } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-claim')
        .setDescription('Claim a ticket to indicate you are handling it')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        try {
            // Check if the channel is a ticket
            const channelName = interaction.channel.name;
            
            if (!channelName.startsWith('ticket-')) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Not a Ticket', 'This command can only be used in ticket channels.')],
                    ephemeral: true
                });
            }
            
            // Get ticket ID from channel name
            const ticketId = channelName.split('-')[1];
            
            // Get ticket data
            const ticketData = tickets.getTicket(ticketId);
            
            if (!ticketData) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Invalid Ticket', 'This ticket does not exist in the database.')],
                    ephemeral: true
                });
            }
            
            if (ticketData.claimed) {
                // Check if the ticket is already claimed by this user
                if (ticketData.claimedBy === interaction.user.id) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Already Claimed', 'You have already claimed this ticket.')],
                        ephemeral: true
                    });
                }
                
                // Check if the ticket is claimed by someone else
                const claimedByUser = await interaction.client.users.fetch(ticketData.claimedBy).catch(() => null);
                
                if (claimedByUser) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Already Claimed', `This ticket is already claimed by ${claimedByUser.tag}.`)],
                        ephemeral: true
                    });
                }
            }
            
            // Claim the ticket
            ticketData.claimed = true;
            ticketData.claimedBy = interaction.user.id;
            ticketData.claimedAt = Date.now();
            
            tickets.updateTicket(ticketId, ticketData);
            
            // Send confirmation message
            const embed = createSuccessEmbed(
                'Ticket Claimed',
                `This ticket has been claimed by ${interaction.user}.`
            )
            .addFields(
                { name: 'Ticket ID', value: `#${ticketId}`, inline: true },
                { name: 'Claimed By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            // Log the claim
            const guildSettings = tickets.getSettings(interaction.guild.id);
            
            if (guildSettings.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00FFFF')
                        .setTitle('Ticket Claimed')
                        .addFields(
                            { name: 'Ticket ID', value: `#${ticketId}`, inline: true },
                            { name: 'Channel', value: `${interaction.channel} (${interaction.channel.id})`, inline: true },
                            { name: 'Claimed By', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                            { name: 'User', value: `<@${ticketData.userId}> (${ticketData.userId})`, inline: true }
                        )
                        .setFooter({ text: `Staff ID: ${interaction.user.id}` })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error('Error claiming ticket:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while claiming the ticket.')],
                ephemeral: true
            });
        }
    },
    
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('ticket_claim_')) {
            return;
        }
        
        try {
            // Get ticket ID from button custom ID
            const ticketId = interaction.customId.split('_')[2];
            
            // Get ticket data
            const ticketData = tickets.getTicket(ticketId);
            
            if (!ticketData) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Invalid Ticket', 'This ticket does not exist in the database.')],
                    ephemeral: true
                });
            }
            
            if (ticketData.claimed) {
                // Check if the ticket is already claimed by this user
                if (ticketData.claimedBy === interaction.user.id) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Already Claimed', 'You have already claimed this ticket.')],
                        ephemeral: true
                    });
                }
                
                // Check if the ticket is claimed by someone else
                const claimedByUser = await interaction.client.users.fetch(ticketData.claimedBy).catch(() => null);
                
                if (claimedByUser) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Already Claimed', `This ticket is already claimed by ${claimedByUser.tag}.`)],
                        ephemeral: true
                    });
                }
            }
            
            // Claim the ticket
            ticketData.claimed = true;
            ticketData.claimedBy = interaction.user.id;
            ticketData.claimedAt = Date.now();
            
            tickets.updateTicket(ticketId, ticketData);
            
            // Send confirmation message
            const embed = createSuccessEmbed(
                'Ticket Claimed',
                `This ticket has been claimed by ${interaction.user}.`
            )
            .addFields(
                { name: 'Ticket ID', value: `#${ticketId}`, inline: true },
                { name: 'Claimed By', value: `${interaction.user.tag}`, inline: true },
                { name: 'Claimed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            // Log the claim
            const guildSettings = tickets.getSettings(interaction.guild.id);
            
            if (guildSettings.logChannel) {
                const logChannel = interaction.guild.channels.cache.get(guildSettings.logChannel);
                
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00FFFF')
                        .setTitle('Ticket Claimed')
                        .addFields(
                            { name: 'Ticket ID', value: `#${ticketId}`, inline: true },
                            { name: 'Channel', value: `${interaction.channel} (${interaction.channel.id})`, inline: true },
                            { name: 'Claimed By', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                            { name: 'User', value: `<@${ticketData.userId}> (${ticketData.userId})`, inline: true }
                        )
                        .setFooter({ text: `Staff ID: ${interaction.user.id}` })
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }
        } catch (error) {
            console.error('Error claiming ticket:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while claiming the ticket.')],
                ephemeral: true
            });
        }
    }
};