const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option => 
            option.setName('userid')
                .setDescription('The ID of the user to unban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for unbanning the user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.BanMembers])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Ban Members permission to use this command.')],
                ephemeral: true
            });
        }
        
        const userId = interaction.options.getString('userid');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            const banList = await interaction.guild.bans.fetch();
            const bannedUser = banList.find(ban => ban.user.id === userId);
            
            if (!bannedUser) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'This user is not banned.')],
                    ephemeral: true
                });
            }
            
            await interaction.guild.members.unban(userId, `${interaction.user.tag}: ${reason}`);
            
            const embed = createSuccessEmbed(
                '🔓 User Unbanned',
                `${bannedUser.user.tag} has been unbanned from the server.`
            )
            .addFields(
                { name: 'User', value: `${bannedUser.user.tag} (${bannedUser.user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason }
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error unbanning user:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to unban the user. Make sure the ID is valid.')],
                ephemeral: true
            });
        }
    }
};