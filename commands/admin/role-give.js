const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role-give')
        .setDescription('Give a role to a user or all members')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role to give')
                .setRequired(true))
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to give the role to (leave empty for all members)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for giving the role')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('all-members')
                .setDescription('Give the role to all members')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageRoles])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Roles permission to use this command.')],
                ephemeral: true
            });
        }
        
        const role = interaction.options.getRole('role');
        const user = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const allMembers = interaction.options.getBoolean('all-members') || false;
        
        if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot give a role that is higher than or equal to your highest role.')],
                ephemeral: true
            });
        }
        
        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'I cannot give a role that is higher than or equal to my highest role.')],
                ephemeral: true
            });
        }
        
        if (role.managed) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'This role is managed by an integration and cannot be manually assigned.')],
                ephemeral: true
            });
        }
        
        if (user && !allMembers) {
            // Give role to a specific user
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (!member) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'User not found in this server.')],
                    ephemeral: true
                });
            }
            
            if (member.roles.cache.has(role.id)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', `${member} already has the ${role} role.`)],
                    ephemeral: true
                });
            }
            
            try {
                await member.roles.add(role, reason);
                
                const embed = createSuccessEmbed(
                    '✅ Role Added',
                    `${role} has been given to ${member}.`
                )
                .addFields(
                    { name: 'User', value: `${member} (${member.id})`, inline: true },
                    { name: 'Role', value: `${role} (${role.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user}`, inline: true },
                    { name: 'Reason', value: reason }
                );
                
                await interaction.reply({ embeds: [embed] });
                
                try {
                    await member.send({ 
                        embeds: [createInfoEmbed(
                            `You have been given a role in ${interaction.guild.name}`,
                            `**Role:** ${role.name}\n**Reason:** ${reason}`
                        )]
                    });
                } catch (error) {
                    console.error('Could not DM user about role addition:', error);
                }
            } catch (error) {
                console.error('Error giving role to user:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while trying to give the role.')],
                    ephemeral: true
                });
            }
        } else if (allMembers || (!user && allMembers !== false)) {
            // Give role to all members
            await interaction.deferReply();
            
            try {
                const members = await interaction.guild.members.fetch();
                let successCount = 0;
                let failCount = 0;
                
                for (const [memberId, member] of members) {
                    if (!member.roles.cache.has(role.id) && !member.user.bot) {
                        try {
                            await member.roles.add(role, reason);
                            successCount++;
                        } catch (error) {
                            console.error(`Error giving role to ${member.user.tag}:`, error);
                            failCount++;
                        }
                    }
                }
                
                const embed = createSuccessEmbed(
                    '✅ Mass Role Addition',
                    `${role} has been given to ${successCount} member${successCount === 1 ? '' : 's'}.`
                )
                .addFields(
                    { name: 'Role', value: `${role} (${role.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user}`, inline: true },
                    { name: 'Reason', value: reason },
                    { name: 'Success', value: `${successCount} member${successCount === 1 ? '' : 's'}`, inline: true }
                );
                
                if (failCount > 0) {
                    embed.addFields({ name: 'Failed', value: `${failCount} member${failCount === 1 ? '' : 's'}`, inline: true });
                }
                
                await interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in mass role addition:', error);
                
                await interaction.editReply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while trying to give the role to all members.')]
                });
            }
        } else {
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You must either specify a user or enable the all-members option.')],
                ephemeral: true
            });
        }
    }
};