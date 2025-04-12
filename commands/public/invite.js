const { SlashCommandBuilder, ButtonStyle } = require('discord.js');
const { createInfoEmbed, createButton, createActionRow } = require('../../utils/embeds');
const { CLIENT_ID } = process.env;
module.exports = {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get an invite link for the bot'),
    
    async execute(interaction) {
        const clientId = interaction.client.user.id;
        
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&scope=bot%20applications.commands`;
        
        const embed = createInfoEmbed(
            '🔗 Invite Link',
            'Click the button below to invite the bot to your server!'
        )
        .setThumbnail(interaction.client.user.displayAvatarURL())
        .addFields(
            { name: 'Bot Name', value: interaction.client.user.username, inline: true },
            { name: 'Bot ID', value: CLIENT_ID, inline: true }
        );
        
        const inviteButton = createButton('Invite Bot', 'invite_link', ButtonStyle.Link, false, '🔗', inviteLink);
        const supportButton = createButton('Support Server', 'support_link', ButtonStyle.Primary, false, '❓');
        
        const row = createActionRow([inviteButton, supportButton]);
        
        const message = await interaction.reply({ 
            embeds: [embed], 
            components: [row],
            fetchReply: true
        });
        
        const collector = message.createMessageComponentCollector({ time: 60000 });
        
        collector.on('collect', async i => {
            if (i.customId === 'invite_link') {
                await i.reply({ content: `Here's your invite link: ${inviteLink}`, ephemeral: true });
            } else if (i.customId === 'support_link') {
                await i.reply({ content: 'Join our support server: https://discord.gg/j2b8kdgrbR', ephemeral: true });
            }
        });
    }
};