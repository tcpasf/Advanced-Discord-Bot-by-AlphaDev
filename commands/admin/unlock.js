const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Unlock a channel to allow members to send messages')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to unlock (defaults to current channel)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for unlocking the channel')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageChannels])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Channels permission to use this command.')],
                ephemeral: true
            });
        }
        
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (channel.type !== 0) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Invalid Channel', 'This command can only be used on text channels.')],
                ephemeral: true
            });
        }
        
        try {
            await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: null
            });
            
            const embed = createSuccessEmbed(
                '🔓 Channel Unlocked',
                `${channel} has been unlocked.`
            )
            .addFields({ name: 'Reason', value: reason })
            .addFields({ name: 'Unlocked By', value: `${interaction.user}` });
            
            await interaction.reply({ embeds: [embed] });
            
            if (channel.id !== interaction.channelId) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error unlocking channel:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to unlock the channel.')],
                ephemeral: true
            });
        }
    }
};