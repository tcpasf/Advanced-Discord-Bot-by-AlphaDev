const { SlashCommandBuilder } = require('discord.js');
const { createInfoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Display information about the server'),
    
    async execute(interaction) {
        const guild = interaction.guild;
        
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(member => member.presence?.status === 'online').size;
        const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
        const categories = guild.channels.cache.filter(channel => channel.type === 4).size;
        const roles = guild.roles.cache.size;
        const emojis = guild.emojis.cache.size;
        
        const verificationLevels = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Very High'
        };
        
        const embed = createInfoEmbed(
            guild.name,
            `Server information for ${guild.name}`
        )
        .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
        .addFields(
            { name: 'Server ID', value: guild.id, inline: true },
            { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
            { name: 'Created At', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
            { name: 'Members', value: `Total: ${totalMembers}\nOnline: ${onlineMembers}`, inline: true },
            { name: 'Channels', value: `Text: ${textChannels}\nVoice: ${voiceChannels}\nCategories: ${categories}`, inline: true },
            { name: 'Other', value: `Roles: ${roles}\nEmojis: ${emojis}`, inline: true },
            { name: 'Verification Level', value: verificationLevels[guild.verificationLevel], inline: true },
            { name: 'Boost Level', value: `Level ${guild.premiumTier}`, inline: true },
            { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0} boosts`, inline: true }
        );
        
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 1024 }));
        }
        
        await interaction.reply({ embeds: [embed] });
    }
};