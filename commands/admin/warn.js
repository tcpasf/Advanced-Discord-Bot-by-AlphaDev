const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { warnings } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Manage user warnings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Warn a user')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to warn')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('The reason for the warning')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a warning from a user')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to remove a warning from')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('warning-id')
                        .setDescription('The ID of the warning to remove')
                        .setRequired(true)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ModerateMembers])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Moderate Members permission to use this command.')],
                ephemeral: true
            });
        }
        
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        
        if (!member) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'User not found in this server.')],
                ephemeral: true
            });
        }
        
        if (member.user.bot) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot warn a bot.')],
                ephemeral: true
            });
        }
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot warn yourself.')],
                ephemeral: true
            });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot warn a member with a higher or equal role.')],
                ephemeral: true
            });
        }
        
        if (subcommand === 'add') {
            const reason = interaction.options.getString('reason');
            
            try {
                const warning = {
                    reason: reason,
                    moderator: interaction.user.id,
                    timestamp: Date.now()
                };
                
                const warningObj = warnings.addWarning(user.id, interaction.guild.id, warning);
                const userWarnings = warnings.getUserWarnings(user.id, interaction.guild.id);
                
                const embed = createSuccessEmbed(
                    '⚠️ User Warned',
                    `${member} has been warned.`
                )
                .addFields(
                    { name: 'User', value: `${member} (${member.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user}`, inline: true },
                    { name: 'Warning ID', value: warningObj.id, inline: true },
                    { name: 'Reason', value: reason },
                    { name: 'Total Warnings', value: `${userWarnings.length}` }
                );
                
                await interaction.reply({ embeds: [embed] });
                
                try {
                    await member.send({ 
                        embeds: [createErrorEmbed(
                            `You have been warned in ${interaction.guild.name}`,
                            `**Reason:** ${reason}\n**Warning ID:** ${warningObj.id}\n**Total Warnings:** ${userWarnings.length}`
                        )]
                    });
                } catch (error) {
                    console.error('Could not DM user about warning:', error);
                }
            } catch (error) {
                console.error('Error warning user:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while trying to warn the user.')],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'remove') {
            const warningId = interaction.options.getString('warning-id');
            
            try {
                const removed = warnings.removeWarning(user.id, interaction.guild.id, warningId);
                
                if (!removed) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Error', 'Warning not found. Please check the warning ID.')],
                        ephemeral: true
                    });
                }
                
                const userWarnings = warnings.getUserWarnings(user.id, interaction.guild.id);
                
                const embed = createSuccessEmbed(
                    '✅ Warning Removed',
                    `A warning has been removed from ${member}.`
                )
                .addFields(
                    { name: 'User', value: `${member} (${member.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user}`, inline: true },
                    { name: 'Warning ID', value: warningId, inline: true },
                    { name: 'Remaining Warnings', value: `${userWarnings.length}` }
                );
                
                await interaction.reply({ embeds: [embed] });
                
                try {
                    await member.send({ 
                        embeds: [createSuccessEmbed(
                            `A warning has been removed in ${interaction.guild.name}`,
                            `**Warning ID:** ${warningId}\n**Remaining Warnings:** ${userWarnings.length}`
                        )]
                    });
                } catch (error) {
                    console.error('Could not DM user about warning removal:', error);
                }
            } catch (error) {
                console.error('Error removing warning:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while trying to remove the warning.')],
                    ephemeral: true
                });
            }
        }
    }
};