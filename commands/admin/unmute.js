const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { mutes } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Unmute a user in text channels')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to unmute')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for unmuting the user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ModerateMembers])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Moderate Members permission to use this command.')],
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
        
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            const muteRole = interaction.guild.roles.cache.find(role => role.name === 'Muted');
            
            if (!muteRole) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'Mute role not found.')],
                    ephemeral: true
                });
            }
            
            if (!member.roles.cache.has(muteRole.id)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'This user is not muted.')],
                    ephemeral: true
                });
            }
            
            await member.roles.remove(muteRole);
            
            mutes.removeTextMute(interaction.guild.id, member.id);
            
            const embed = createSuccessEmbed(
                '🔊 User Unmuted',
                `${member} has been unmuted.`
            )
            .addFields(
                { name: 'User', value: `${member} (${member.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user}`, inline: true },
                { name: 'Reason', value: reason }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            try {
                await member.send({ 
                    embeds: [createSuccessEmbed(
                        `You have been unmuted in ${interaction.guild.name}`,
                        `**Reason:** ${reason}`
                    )]
                });
            } catch (error) {
                console.error('Could not DM user about unmute:', error);
            }
        } catch (error) {
            console.error('Error unmuting user:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to unmute the user.')],
                ephemeral: true
            });
        }
    }
};