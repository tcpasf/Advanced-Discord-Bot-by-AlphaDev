const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { warnings } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('View warnings for a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to view warnings for')
                .setRequired(true))
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
        
        try {
            const userWarnings = warnings.getUserWarnings(user.id, interaction.guild.id);
            
            if (userWarnings.length === 0) {
                return interaction.reply({ 
                    embeds: [createInfoEmbed(
                        '📋 User Warnings',
                        `${member} has no warnings.`
                    )]
                });
            }
            
            const embed = createInfoEmbed(
                '📋 User Warnings',
                `${member} has ${userWarnings.length} warning${userWarnings.length === 1 ? '' : 's'}.`
            )
            .addFields(
                { name: 'User', value: `${member} (${member.id})` }
            );
            
            // Sort warnings by timestamp (newest first)
            userWarnings.sort((a, b) => b.timestamp - a.timestamp);
            
            // Add up to 10 warnings to the embed
            const warningsToShow = userWarnings.slice(0, 10);
            
            for (const warning of warningsToShow) {
                const moderator = await interaction.client.users.fetch(warning.moderator).catch(() => null);
                const moderatorName = moderator ? moderator.tag : 'Unknown Moderator';
                const date = new Date(warning.timestamp).toLocaleString();
                
                embed.addFields({
                    name: `Warning ID: ${warning.id}`,
                    value: `**Reason:** ${warning.reason}\n**Moderator:** ${moderatorName}\n**Date:** ${date}`
                });
            }
            
            if (userWarnings.length > 10) {
                embed.setFooter({ text: `Showing 10 of ${userWarnings.length} warnings. Use /warnings to see more.` });
            }
            
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching warnings:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to fetch the warnings.')],
                ephemeral: true
            });
        }
    }
};