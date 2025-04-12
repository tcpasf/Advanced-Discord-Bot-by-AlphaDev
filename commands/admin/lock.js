const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Lock a channel to prevent members from sending messages')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to lock (defaults to current channel)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for locking the channel')
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
                SendMessages: false
            });
            
            const embed = createSuccessEmbed(
                '🔒 Channel Locked',
                `${channel} has been locked.`
            )
            .addFields({ name: 'Reason', value: reason })
            .addFields({ name: 'Locked By', value: `${interaction.user}` });
            
            await interaction.reply({ embeds: [embed] });
            
            if (channel.id !== interaction.channelId) {
                await channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error('Error locking channel:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to lock the channel.')],
                ephemeral: true
            });
        }
    }
};