const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { mutes } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vc-mute')
        .setDescription('Manage voice channel mutes')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Mute a user in voice channels')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to mute')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('The reason for muting the user')
                        .setRequired(false))
                .addIntegerOption(option => 
                    option.setName('duration')
                        .setDescription('The duration of the mute in minutes (0 for permanent)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Unmute a user in voice channels')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user to unmute')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                        .setDescription('The reason for unmuting the user')
                        .setRequired(false)))
        .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.MuteMembers])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Mute Members permission to use this command.')],
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
                embeds: [createErrorEmbed('Error', 'You cannot voice mute a bot.')],
                ephemeral: true
            });
        }
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot voice mute yourself.')],
                ephemeral: true
            });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot voice mute a member with a higher or equal role.')],
                ephemeral: true
            });
        }
        
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        if (subcommand === 'add') {
            const duration = interaction.options.getInteger('duration') || 0;
            
            try {
                // Mute the user in their current voice channel if they're in one
                if (member.voice.channel) {
                    await member.voice.setMute(true, reason);
                }
                
                const muteData = {
                    userId: member.id,
                    moderatorId: interaction.user.id,
                    reason: reason,
                    timestamp: Date.now(),
                    duration: duration * 60 * 1000,
                    expiresAt: duration > 0 ? Date.now() + (duration * 60 * 1000) : 0
                };
                
                mutes.addVoiceMute(interaction.guild.id, member.id, muteData);
                
                const durationText = duration > 0 
                    ? `${duration} minute${duration === 1 ? '' : 's'}`
                    : 'Permanent';
                
                const embed = createSuccessEmbed(
                    '🔇 User Voice Muted',
                    `${member} has been muted in voice channels.`
                )
                .addFields(
                    { name: 'User', value: `${member} (${member.id})`, inline: true },
                    { name: 'Moderator', value: `${interaction.user}`, inline: true },
                    { name: 'Duration', value: durationText, inline: true },
                    { name: 'Reason', value: reason }
                );
                
                await interaction.reply({ embeds: [embed] });
                
                try {
                    await member.send({ 
                        embeds: [createErrorEmbed(
                            `You have been voice muted in ${interaction.guild.name}`,
                            `**Duration:** ${durationText}\n**Reason:** ${reason}`
                        )]
                    });
                } catch (error) {
                    console.error('Could not DM user about voice mute:', error);
                }
                
                if (duration > 0) {
                    setTimeout(async () => {
                        try {
                            const guildMutes = mutes.getVoiceMutes(interaction.guild.id);
                            
                            if (guildMutes[member.id] && guildMutes[member.id].expiresAt <= Date.now()) {
                                const guildMember = await interaction.guild.members.fetch(member.id).catch(() => null);
                                
                                if (guildMember && guildMember.voice.channel) {
                                    await guildMember.voice.setMute(false).catch(console.error);
                                }
                                
                                mutes.removeVoiceMute(interaction.guild.id, member.id);
                            }
                        } catch (error) {
                            console.error('Error unmuting user after duration:', error);
                        }
                    }, duration * 60 * 1000);
                }
            } catch (error) {
                console.error('Error voice muting user:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while trying to voice mute the user.')],
                    ephemeral: true
                });
            }
        } else if (subcommand === 'remove') {
            try {
                // Unmute the user in their current voice channel if they're in one
                if (member.voice.channel) {
                    await member.voice.setMute(false, reason);
                }
                
                mutes.removeVoiceMute(interaction.guild.id, member.id);
                
                const embed = createSuccessEmbed(
                    '🔊 User Voice Unmuted',
                    `${member} has been unmuted in voice channels.`
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
                            `You have been voice unmuted in ${interaction.guild.name}`,
                            `**Reason:** ${reason}`
                        )]
                    });
                } catch (error) {
                    console.error('Could not DM user about voice unmute:', error);
                }
            } catch (error) {
                console.error('Error voice unmuting user:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'An error occurred while trying to voice unmute the user.')],
                    ephemeral: true
                });
            }
        }
    }
};