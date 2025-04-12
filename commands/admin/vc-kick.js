const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vc-kick')
        .setDescription('Kick a user from their current voice channel')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to kick from voice channel')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for kicking the user from voice channel')
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
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot voice kick yourself.')],
                ephemeral: true
            });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot voice kick a member with a higher or equal role.')],
                ephemeral: true
            });
        }
        
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const voiceChannel = member.voice.channel;
        
        try {
            await member.voice.disconnect(reason);
            
            const embed = createSuccessEmbed(
                '👢 User Voice Kicked',
                `${member} has been kicked from the voice channel.`
            )
            .addFields(
                { name: 'User', value: `${member} (${member.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user}`, inline: true },
                { name: 'Voice Channel', value: voiceChannel.name, inline: true },
                { name: 'Reason', value: reason }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            try {
                await member.send({ 
                    embeds: [createErrorEmbed(
                        `You have been kicked from a voice channel in ${interaction.guild.name}`,
                        `**Channel:** ${voiceChannel.name}\n**Reason:** ${reason}`
                    )]
                });
            } catch (error) {
                console.error('Could not DM user about voice kick:', error);
            }
        } catch (error) {
            console.error('Error voice kicking user:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to kick the user from the voice channel.')],
                ephemeral: true
            });
        }
    }
};