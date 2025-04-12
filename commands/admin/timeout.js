const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to timeout')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('The duration of the timeout (e.g., 1m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('The reason for the timeout')
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
                embeds: [createErrorEmbed('Error', 'You cannot timeout a bot.')],
                ephemeral: true
            });
        }
        
        if (member.id === interaction.user.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot timeout yourself.')],
                ephemeral: true
            });
        }
        
        if (member.roles.highest.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'You cannot timeout a member with a higher or equal role.')],
                ephemeral: true
            });
        }
        
        if (!member.moderatable) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'I cannot timeout this user. Make sure my role is above theirs.')],
                ephemeral: true
            });
        }
        
        const durationString = interaction.options.getString('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        try {
            const duration = ms(durationString);
            
            if (!duration || duration < 1000 || duration > 2419200000) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Invalid Duration', 'Please provide a valid duration between 1 second and 28 days (e.g., 1m, 1h, 1d).')],
                    ephemeral: true
                });
            }
            
            await member.timeout(duration, reason);
            
            const embed = createSuccessEmbed(
                '⏱️ User Timed Out',
                `${member} has been timed out.`
            )
            .addFields(
                { name: 'User', value: `${member} (${member.id})`, inline: true },
                { name: 'Moderator', value: `${interaction.user}`, inline: true },
                { name: 'Duration', value: durationString, inline: true },
                { name: 'Expires', value: `<t:${Math.floor((Date.now() + duration) / 1000)}:R>`, inline: true },
                { name: 'Reason', value: reason }
            );
            
            await interaction.reply({ embeds: [embed] });
            
            try {
                await member.send({ 
                    embeds: [createErrorEmbed(
                        `You have been timed out in ${interaction.guild.name}`,
                        `**Duration:** ${durationString}\n**Expires:** <t:${Math.floor((Date.now() + duration) / 1000)}:R>\n**Reason:** ${reason}`
                    )]
                });
            } catch (error) {
                console.error('Could not DM user about timeout:', error);
            }
        } catch (error) {
            console.error('Error timing out user:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while trying to timeout the user.')],
                ephemeral: true
            });
        }
    }
};