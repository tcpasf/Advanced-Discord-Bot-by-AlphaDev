const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { createInfoEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Display a custom banner for a user')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to create a banner for')
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        
        const canvas = createCanvas(1000, 300);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#23272A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#2C2F33';
        ctx.fillRect(25, 25, canvas.width - 50, canvas.height - 50);
        
        ctx.beginPath();
        ctx.moveTo(25, 25);
        ctx.lineTo(canvas.width - 25, 25);
        ctx.lineTo(canvas.width - 25, canvas.height - 25);
        ctx.lineTo(25, canvas.height - 25);
        ctx.closePath();
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#7289DA';
        ctx.stroke();
        
        const avatarSize = 150;
        const avatarX = 75;
        const avatarY = canvas.height / 2 - avatarSize / 2;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        
        ctx.font = 'bold 50px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(user.username, 250, 100);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = '#99AAB5';
        ctx.fillText(`ID: ${user.id}`, 250, 150);
        
        ctx.fillText(`Joined: ${member.joinedAt.toDateString()}`, 250, 200);
        
        ctx.fillText(`Created: ${user.createdAt.toDateString()}`, 250, 250);
        
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'banner.png' });
        
        await interaction.editReply({ files: [attachment] });
    }
};