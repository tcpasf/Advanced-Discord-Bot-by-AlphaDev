const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move-all')
        .setDescription('Move all members from one voice channel to another')
        .addChannelOption(option => 
            option.setName('from')
                .setDescription('The voice channel to move members from')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('to')
                .setDescription('The voice channel to move members to')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for moving the members')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.MoveMembers])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Move Members permission to use this command.')],
                ephemeral: true
            });
        }
        
        const fromChannel = interaction.options.getChannel('from');
        const toChannel = interaction.options.getChannel('to');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (fromChannel.id === toChannel.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'The source and destination channels cannot be the same.')],
                ephemeral: true
            });
        }
        
        try {
            const members = fromChannel.members;
            
            if (members.size === 0) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', `There are no members in ${fromChannel}.`)],
                    ephemeral: true
                });
            }
            
            let movedCount = 0;
            let failedCount = 0;
            
            for (const [memberId, member] of members) {
                try {
                    await member.voice.setChannel(toChannel, reason);
                    movedCount++;
                } catch (error) {
                    console.error(`Failed to move ${member.user.tag}:`, error);
                    failedCount++;
                }
            }
            
            const embed = createSuccessEmbed(
                '🔄 Members Moved',
                `Successfully moved ${movedCount} member${movedCount === 1 ? '' : 's'} from ${fromChannel} to ${toChannel}.`
            )
            .addFields(
                { name: 'From', value: `${fromChannel} (${fromChannel.id})`, inline: true },
                { name: 'To', value: `${toChannel} (${toChannel.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user}`, inline: true },
                { name: 'Reason', value: reason }
            );
            
            if (failedCount > 0) {
                embed.addFields({ name: 'Failed', value: `Failed to move ${failedCount} member${failedCount === 1 ? '' : 's'}.` });
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error moving members:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to move the members.')],
                ephemeral: true
            });
        }
    }
};