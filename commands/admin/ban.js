const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to ban')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for banning the user')
                .setRequired(false))
        .addIntegerOption(option => 
            option.setName('days')
                .setDescription('Number of days of messages to delete (0-7)')
                .setMinValue(0)
                .setMaxValue(7)
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.BanMembers])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Ban Members permission to use this command.')],
                ephemeral: true
            });
        }
        
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (member) {
            if (member.user.bot && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'You cannot ban a bot without Administrator permissions.')],
                    ephemeral: true
                });
            }
            
            if (member.id === interaction.user.id) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'You cannot ban yourself.')],
                    ephemeral: true
                });
            }
            
            if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'You cannot ban a member with a higher or equal role.')],
                    ephemeral: true
                });
            }
            
            if (!member.bannable) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'I cannot ban this user. Make sure my role is above theirs.')],
                    ephemeral: true
                });
            }
        }
        
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const days = interaction.options.getInteger('days') || 0;
        
        try {
            if (member) {
                try {
                    await member.send({ 
                        embeds: [createErrorEmbed(
                            `You have been banned from ${interaction.guild.name}`,
                            `**Reason:** ${reason}`
                        )]
                    });
                } catch (error) {
                    console.error('Could not DM user about ban:', error);
                }
            }
            
            await interaction.guild.members.ban(user.id, { 
                deleteMessageDays: days,
                reason: `${interaction.user.tag}: ${reason}`
            });
            
            const embed = createSuccessEmbed(
                '🔨 User Banned',
                `${user.tag} has been banned from the server.`
            )
            .addFields(
                { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
                { name: 'Reason', value: reason },
                { name: 'Message Deletion', value: `${days} day${days === 1 ? '' : 's'}`, inline: true }
            );
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error banning user:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to ban the user.')],
                ephemeral: true
            });
        }
    }
};