const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { verification } = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verification-manual')
        .setDescription('Manually verify or unverify a user')
        .addSubcommand(subcommand =>
            subcommand
                .setName('verify')
                .setDescription('Manually verify a user')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to verify')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('The reason for manual verification')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unverify')
                .setDescription('Manually unverify a user')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to unverify')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('The reason for manual unverification')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                    ephemeral: true
                });
            }
            
            const subcommand = interaction.options.getSubcommand();
            const user = interaction.options.getUser('user');
            const reason = interaction.options.getString('reason') || 'No reason provided';
            const settings = verification.getSettings(interaction.guild.id);
            
            // Check if verification system is set up
            if (!settings.verifiedRoleId) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Setup Required', 'Please set up the verification system first using `/verification-setup`.')],
                    ephemeral: true
                });
            }
            
            // Get the member
            const member = await interaction.guild.members.fetch(user.id).catch(() => null);
            
            if (!member) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('User Not Found', 'The specified user is not a member of this server.')],
                    ephemeral: true
                });
            }
            
            // Get the verified role
            const verifiedRole = interaction.guild.roles.cache.get(settings.verifiedRoleId);
            
            if (!verifiedRole) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Role Not Found', 'The verified role no longer exists. Please update the verification settings.')],
                    ephemeral: true
                });
            }
            
            // Get the unverified role if set
            let unverifiedRole = null;
            if (settings.unverifiedRoleId) {
                unverifiedRole = interaction.guild.roles.cache.get(settings.unverifiedRoleId);
            }
            
            if (subcommand === 'verify') {
                // Check if user is already verified
                if (member.roles.cache.has(verifiedRole.id)) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Already Verified', `${user} is already verified.`)],
                        ephemeral: true
                    });
                }
                
                // Add verified role
                await member.roles.add(verifiedRole);
                
                // Remove unverified role if set
                if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                    await member.roles.remove(unverifiedRole);
                }
                
                // Update database
                verification.completeVerification(user.id, interaction.guild.id);
                
                // Log the verification
                if (settings.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
                    if (logChannel) {
                        await logChannel.send({ 
                            embeds: [createSuccessEmbed(
                                'Manual Verification',
                                `${user} (${user.id}) was manually verified by ${interaction.user}.\nReason: ${reason}`
                            )]
                        });
                    }
                }
                
                // Send confirmation
                await interaction.reply({ 
                    embeds: [createSuccessEmbed(
                        'User Verified',
                        `${user} has been manually verified.`
                    )]
                });
                
                // Send DM to the user
                try {
                    await user.send({ 
                        embeds: [createSuccessEmbed(
                            `Verified in ${interaction.guild.name}`,
                            `You have been manually verified by a staff member.\nReason: ${reason}`
                        )]
                    });
                } catch (error) {
                    console.error('Could not send DM to user:', error);
                }
            } else if (subcommand === 'unverify') {
                // Check if user is verified
                if (!member.roles.cache.has(verifiedRole.id) && (!unverifiedRole || member.roles.cache.has(unverifiedRole.id))) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Not Verified', `${user} is not verified.`)],
                        ephemeral: true
                    });
                }
                
                // Remove verified role
                if (member.roles.cache.has(verifiedRole.id)) {
                    await member.roles.remove(verifiedRole);
                }
                
                // Add unverified role if set
                if (unverifiedRole && !member.roles.cache.has(unverifiedRole.id)) {
                    await member.roles.add(unverifiedRole);
                }
                
                // Update database
                verification.removeVerification(user.id, interaction.guild.id);
                
                // Log the unverification
                if (settings.logChannelId) {
                    const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
                    if (logChannel) {
                        await logChannel.send({ 
                            embeds: [createErrorEmbed(
                                'Manual Unverification',
                                `${user} (${user.id}) was manually unverified by ${interaction.user}.\nReason: ${reason}`
                            )]
                        });
                    }
                }
                
                // Send confirmation
                await interaction.reply({ 
                    embeds: [createSuccessEmbed(
                        'User Unverified',
                        `${user} has been manually unverified.`
                    )]
                });
                
                // Send DM to the user
                try {
                    await user.send({ 
                        embeds: [createErrorEmbed(
                            `Unverified in ${interaction.guild.name}`,
                            `You have been manually unverified by a staff member.\nReason: ${reason}`
                        )]
                    });
                } catch (error) {
                    console.error('Could not send DM to user:', error);
                }
            }
        } catch (error) {
            console.error('Error with manual verification:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while processing the manual verification.')],
                ephemeral: true
            });
        }
    }
};