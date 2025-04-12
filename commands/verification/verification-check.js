const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { verification } = require('../../utils/database');
const { createInfoEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification-check')
        .setDescription('Check the verification status of a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check (defaults to you)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            // Check if user is checking their own status or has permissions
            const targetUser = interaction.options.getUser('user') || interaction.user;
            
            if (targetUser.id !== interaction.user.id && !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to check other users\' verification status.')],
                    ephemeral: true
                });
            }
            
            const settings = verification.getSettings(interaction.guild.id);
            
            // Get the member
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            
            if (!member) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('User Not Found', 'The specified user is not a member of this server.')],
                    ephemeral: true
                });
            }
            
            // Check verification status
            const isVerified = verification.isVerified(targetUser.id, interaction.guild.id);
            const isPending = !!verification.getVerification(targetUser.id, interaction.guild.id);
            
            // Check role status
            let roleStatus = 'Unknown';
            if (settings.verifiedRoleId) {
                const verifiedRole = interaction.guild.roles.cache.get(settings.verifiedRoleId);
                if (verifiedRole && member.roles.cache.has(verifiedRole.id)) {
                    roleStatus = 'Has Verified Role';
                } else if (settings.unverifiedRoleId) {
                    const unverifiedRole = interaction.guild.roles.cache.get(settings.unverifiedRoleId);
                    if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                        roleStatus = 'Has Unverified Role';
                    } else {
                        roleStatus = 'No Verification Roles';
                    }
                } else {
                    roleStatus = 'Missing Verified Role';
                }
            }
            
            // Get verification data
            const verificationData = verification.get();
            let verificationTime = 'Never';
            
            if (verificationData.verifiedUsers[interaction.guild.id] && 
                verificationData.verifiedUsers[interaction.guild.id][targetUser.id]) {
                const timestamp = verificationData.verifiedUsers[interaction.guild.id][targetUser.id].timestamp;
                verificationTime = `<t:${Math.floor(timestamp / 1000)}:F> (<t:${Math.floor(timestamp / 1000)}:R>)`;
            }
            
            // Create embed
            const embed = new EmbedBuilder()
                .setColor(isVerified ? '#4CAF50' : isPending ? '#FFC107' : '#F44336')
                .setTitle(`Verification Status: ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: 'Status', value: isVerified ? '✅ Verified' : isPending ? '⏳ Pending Verification' : '❌ Not Verified', inline: true },
                    { name: 'Role Status', value: roleStatus, inline: true },
                    { name: 'Verified At', value: verificationTime, inline: true }
                )
                .setFooter({ text: `User ID: ${targetUser.id}` })
                .setTimestamp();
            
            // Add join date
            if (member.joinedAt) {
                embed.addFields({ 
                    name: 'Joined Server', 
                    value: `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F> (<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>)`,
                    inline: true
                });
            }
            
            // Add account creation date
            embed.addFields({ 
                name: 'Account Created', 
                value: `<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:F> (<t:${Math.floor(targetUser.createdAt.getTime() / 1000)}:R>)`,
                inline: true
            });
            
            // Add verification method if verified
            if (isVerified && verificationData.verifiedUsers[interaction.guild.id] && 
                verificationData.verifiedUsers[interaction.guild.id][targetUser.id]) {
                const method = verificationData.verifiedUsers[interaction.guild.id][targetUser.id].method || 'Unknown';
                embed.addFields({ 
                    name: 'Verification Method', 
                    value: method.charAt(0).toUpperCase() + method.slice(1),
                    inline: true
                });
            }
            
            // Add pending verification details if pending
            if (isPending) {
                const pendingData = verification.getVerification(targetUser.id, interaction.guild.id);
                if (pendingData) {
                    const startTime = pendingData.timestamp;
                    embed.addFields({ 
                        name: 'Verification Started', 
                        value: `<t:${Math.floor(startTime / 1000)}:F> (<t:${Math.floor(startTime / 1000)}:R>)`,
                        inline: true
                    });
                    
                    if (pendingData.attempts) {
                        embed.addFields({ 
                            name: 'Attempts', 
                            value: pendingData.attempts.toString(),
                            inline: true
                        });
                    }
                }
            }
            
            await interaction.reply({ 
                embeds: [embed],
                ephemeral: targetUser.id === interaction.user.id || interaction.options.getUser('user') === null
            });
        } catch (error) {
            console.error('Error checking verification status:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while checking the verification status.')],
                ephemeral: true
            });
        }
    }
};