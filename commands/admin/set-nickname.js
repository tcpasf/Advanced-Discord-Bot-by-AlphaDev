const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set-nickname')
        .setDescription('Set a nickname for a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to set a nickname for')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('nickname')
                .setDescription('The new nickname (leave empty to remove)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for changing the nickname')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageNicknames])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Nicknames permission to use this command.')],
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
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot change the nickname of a member with a higher or equal role.')],
                ephemeral: true
            });
        }
        
        if (!member.manageable) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'I cannot change the nickname of this user. Make sure my role is above theirs.')],
                ephemeral: true
            });
        }
        
        const nickname = interaction.options.getString('nickname') || null;
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const oldNickname = member.nickname || member.user.username;
        
        try {
            await member.setNickname(nickname, reason);
            
            const embed = createSuccessEmbed(
                '📝 Nickname Changed',
                nickname 
                    ? `${member}'s nickname has been changed.`
                    : `${member}'s nickname has been reset.`
            )
            .addFields(
                { name: 'User', value: `${member} (${member.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user}`, inline: true },
                { name: 'Old Nickname', value: oldNickname, inline: true },
                { name: 'New Nickname', value: nickname || member.user.username, inline: true },
                { name: 'Reason', value: reason }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            try {
                await member.send({ 
                    embeds: [createInfoEmbed(
                        `Your nickname has been changed in ${interaction.guild.name}`,
                        `**Old Nickname:** ${oldNickname}\n**New Nickname:** ${nickname || member.user.username}\n**Reason:** ${reason}`
                    )]
                });
            } catch (error) {
                console.error('Could not DM user about nickname change:', error);
            }
        } catch (error) {
            console.error('Error changing nickname:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to change the nickname.')],
                ephemeral: true
            });
        }
    }
};