const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move a member to another voice channel')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to move')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The voice channel to move the user to')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for moving the user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.MoveMembers])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Move Members permission to use this command.')],
                ephemeral: true
            });
        }
        
        const user = interaction.options.getUser('user');
        const channel = interaction.options.getChannel('channel');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'User not found in this server.')],
                ephemeral: true
            });
        }
        
        if (!member.voice.channel) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'This user is not in a voice channel.')],
                ephemeral: true
            });
        }
        
        if (member.voice.channel.id === channel.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', `${member} is already in ${channel}.`)],
                ephemeral: true
            });
        }
        
        try {
            const oldChannel = member.voice.channel;
            await member.voice.setChannel(channel, reason);
            
            const embed = createSuccessEmbed(
                '🔄 Member Moved',
                `${member} has been moved to ${channel}.`
            )
            .addFields(
                { name: 'User', value: `${member} (${member.id})`, inline: true },
                { name: 'From', value: `${oldChannel} (${oldChannel.id})`, inline: true },
                { name: 'To', value: `${channel} (${channel.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user}`, inline: true },
                { name: 'Reason', value: reason }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            try {
                await member.send({ 
                    embeds: [createInfoEmbed(
                        `You have been moved to another voice channel in ${interaction.guild.name}`,
                        `**From:** ${oldChannel.name}\n**To:** ${channel.name}\n**Reason:** ${reason}`
                    )]
                });
            } catch (error) {
                console.error('Could not DM user about move:', error);
            }
        } catch (error) {
            console.error('Error moving member:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to move the member.')],
                ephemeral: true
            });
        }
    }
};