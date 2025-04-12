const { SlashCommandBuilder } = require('discord.js');
const { createInfoEmbed, createButton, createActionRow } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vip')
        .setDescription('Information about VIP membership and benefits'),
    
    async execute(interaction) {
        const embed = createInfoEmbed(
            '✨ VIP Membership',
            'Get exclusive benefits with VIP membership!'
        )
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .addFields(
            { name: '💎 VIP Benefits', value: 
                '• Custom role with unique color\n' +
                '• Priority support in tickets\n' +
                '• Access to exclusive channels\n' +
                '• Custom commands and features\n' +
                '• Special event access\n' +
                '• Increased XP gain\n' +
                '• And more!'
            },
            { name: '💰 Pricing', value: 
                '• Monthly: $5.99\n' +
                '• Quarterly: $14.99 (Save 17%)\n' +
                '• Yearly: $49.99 (Save 30%)'
            },
            { name: '📝 How to Purchase', value: 
                'Click the button below to contact the server owner for more information about purchasing VIP membership.'
            }
        )
        .setFooter({ text: 'All payments are processed securely. VIP benefits are specific to this server.' });
        
        const contactButton = createButton('Contact Owner', 'vip_contact', 1, false, '💬');
        const benefitsButton = createButton('View Benefits', 'vip_benefits', 2, false, '✨');
        
        const row = createActionRow([contactButton, benefitsButton]);
        
        const message = await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            fetchReply: true
        });
        
        const collector = message.createMessageComponentCollector({ time: 300000 });
        
        collector.on('collect', async i => {
            if (i.customId === 'vip_contact') {
                const owner = await interaction.guild.fetchOwner();
                await i.reply({ 
                    content: `Please DM ${owner} to purchase VIP membership. Make sure to mention you're from this server!`, 
                    ephemeral: true 
                });
            } else if (i.customId === 'vip_benefits') {
                const benefitsEmbed = createInfoEmbed(
                    '✨ VIP Benefits Details',
                    'Here\'s a detailed breakdown of all VIP benefits'
                )
                .addFields(
                    { name: '💎 Custom Role', value: 'Get a special role with a custom color of your choice that appears above regular members' },
                    { name: '🎮 Exclusive Channels', value: 'Access to VIP-only channels for discussions, game nights, and special events' },
                    { name: '🔧 Custom Commands', value: 'Access to special commands only available to VIP members' },
                    { name: '⚡ Boosted XP', value: '2x XP gain for faster leveling' },
                    { name: '🎫 Priority Support', value: 'Your tickets and questions get answered first' },
                    { name: '🎁 Monthly Giveaways', value: 'Exclusive giveaways only for VIP members' }
                );
                
                await i.reply({ embeds: [benefitsEmbed], ephemeral: true });
            }
        });
    }
};