const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { mutes } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Mute a user in text channels')
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
                .setRequired(false))
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
        
        if (member.user.bot) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot mute a bot.')],
                ephemeral: true
            });
        }
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot mute yourself.')],
                ephemeral: true
            });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot mute a member with a higher or equal role.')],
                ephemeral: true
            });
        }
        
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const duration = interaction.options.getInteger('duration') || 0;
        
        try {
            const muteRole = await getMuteRole(interaction.guild);
            
            if (!muteRole) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Error', 'Failed to create or find mute role.')],
                    ephemeral: true
                });
            }
            
            await member.roles.add(muteRole);
            
            const muteData = {
                userId: member.id,
                moderatorId: interaction.user.id,
                reason: reason,
                timestamp: Date.now(),
                duration: duration * 60 * 1000,
                expiresAt: duration > 0 ? Date.now() + (duration * 60 * 1000) : 0
            };
            
            mutes.addTextMute(interaction.guild.id, member.id, muteData);
            
            const durationText = duration > 0 
                ? `${duration} minute${duration === 1 ? '' : 's'}`
                : 'Permanent';
            
            const embed = createSuccessEmbed(
                '🔇 User Muted',
                `${member} has been muted.`
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
                        `You have been muted in ${interaction.guild.name}`,
                        `**Duration:** ${durationText}\n**Reason:** ${reason}`
                    )]
                });
            } catch (error) {
                console.error('Could not DM user about mute:', error);
            }
            
            if (duration > 0) {
                setTimeout(async () => {
                    try {
                        const guildMutes = mutes.getTextMutes(interaction.guild.id);
                        
                        if (guildMutes[member.id] && guildMutes[member.id].expiresAt <= Date.now()) {
                            const guildMember = await interaction.guild.members.fetch(member.id).catch(() => null);
                            
                            if (guildMember) {
                                await guildMember.roles.remove(muteRole).catch(console.error);
                            }
                            
                            mutes.removeTextMute(interaction.guild.id, member.id);
                        }
                    } catch (error) {
                        console.error('Error unmuting user after duration:', error);
                    }
                }, duration * 60 * 1000);
            }
        } catch (error) {
            console.error('Error muting user:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to mute the user.')],
                ephemeral: true
            });
        }
    }
};

async function getMuteRole(guild) {
    let muteRole = guild.roles.cache.find(role => role.name === 'Muted');
    
    if (!muteRole) {
        try {
            muteRole = await guild.roles.create({
                name: 'Muted',
                color: '#808080',
                reason: 'Role for muted users'
            });
            
            for (const channel of guild.channels.cache.values()) {
                if (channel.type === 0 || channel.type === 2) {
                    await channel.permissionOverwrites.edit(muteRole, {
                        SendMessages: false,
                        AddReactions: false,
                        Speak: false
                    }).catch(console.error);
                }
            }
        } catch (error) {
            console.error('Error creating mute role:', error);
            return null;
        }
    }
    
    return muteRole;
}