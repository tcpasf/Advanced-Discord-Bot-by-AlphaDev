const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to kick')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for kicking the user')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.KickMembers])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Kick Members permission to use this command.')],
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
        
        if (member.user.bot && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot kick a bot without Administrator permissions.')],
                ephemeral: true
            });
        }
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot kick yourself.')],
                ephemeral: true
            });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot kick a member with a higher or equal role.')],
                ephemeral: true
            });
        }
        
        if (!member.kickable) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'I cannot kick this user. Make sure my role is above theirs.')],
                ephemeral: true
            });
        }
        
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            try {
                await member.send({ 
                    embeds: [createErrorEmbed(
                        `You have been kicked from ${interaction.guild.name}`,
                        `**Reason:** ${reason}`
                    )]
                });
            } catch (error) {
                console.error('Could not DM user about kick:', error);
            }
            
            await member.kick(reason);
            
            const embed = createSuccessEmbed(
                '👢 User Kicked',
                `${user.tag} has been kicked from the server.`
            )
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason }
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error kicking user:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to kick the user.')],
                ephemeral: true
            });
        }
    }
};