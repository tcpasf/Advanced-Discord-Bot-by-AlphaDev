const { SlashCommandBuilder } = require('discord.js');
const { createInfoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Display information about a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to display information about')
                .setRequired(false)),
    
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        
        const roles = member.roles.cache
            .filter(role => role.id !== interaction.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(role => `<@&${role.id}>`)
            .join(', ') || 'None';
        
        const badges = [];
        if (user.flags) {
            const userFlags = user.flags.toArray();
            
            if (userFlags.includes('Staff')) badges.push('Discord Staff');
            if (userFlags.includes('Partner')) badges.push('Discord Partner');
            if (userFlags.includes('Hypesquad')) badges.push('HypeSquad Events');
            if (userFlags.includes('BugHunterLevel1')) badges.push('Bug Hunter (Level 1)');
            if (userFlags.includes('BugHunterLevel2')) badges.push('Bug Hunter (Level 2)');
            if (userFlags.includes('HypeSquadOnlineHouse1')) badges.push('House of Bravery');
            if (userFlags.includes('HypeSquadOnlineHouse2')) badges.push('House of Brilliance');
            if (userFlags.includes('HypeSquadOnlineHouse3')) badges.push('House of Balance');
            if (userFlags.includes('PremiumEarlySupporter')) badges.push('Early Supporter');
            if (userFlags.includes('VerifiedDeveloper')) badges.push('Verified Bot Developer');
            if (userFlags.includes('VerifiedBot')) badges.push('Verified Bot');
            if (userFlags.includes('CertifiedModerator')) badges.push('Certified Moderator');
            if (userFlags.includes('BotHTTPInteractions')) badges.push('HTTP Interactions Bot');
            if (userFlags.includes('ActiveDeveloper')) badges.push('Active Developer');
        }
        
        const embed = createInfoEmbed(
            user.tag,
            `User information for ${user.username}`
        )
        .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
        .addFields(
            { name: 'User ID', value: user.id, inline: true },
            { name: 'Nickname', value: member.nickname || 'None', inline: true },
            { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
            { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
            { name: 'Roles', value: roles.length > 1024 ? `${roles.substring(0, 1020)}...` : roles },
            { name: 'Badges', value: badges.length ? badges.join(', ') : 'None' }
        );
        
        if (member.premiumSince) {
            embed.addFields({ name: 'Boosting Since', value: `<t:${Math.floor(member.premiumSince / 1000)}:F>`, inline: true });
        }
        
        if (member.presence) {
            const status = {
                online: '🟢 Online',
                idle: '🟡 Idle',
                dnd: '🔴 Do Not Disturb',
                offline: '⚫ Offline'
            };
            
            embed.addFields({ name: 'Status', value: status[member.presence.status] || 'Unknown', inline: true });
            
            if (member.presence.activities.length > 0) {
                const activity = member.presence.activities[0];
                let activityText = `${activity.type === 0 ? 'Playing' : activity.type === 1 ? 'Streaming' : activity.type === 2 ? 'Listening to' : activity.type === 3 ? 'Watching' : 'Activity:'} ${activity.name}`;
                
                if (activity.details) {
                    activityText += `\n${activity.details}`;
                }
                
                if (activity.state) {
                    activityText += `\n${activity.state}`;
                }
                
                embed.addFields({ name: 'Activity', value: activityText });
            }
        }
        
        if (member.banner) {
            embed.setImage(member.bannerURL({ dynamic: true, size: 1024 }));
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};