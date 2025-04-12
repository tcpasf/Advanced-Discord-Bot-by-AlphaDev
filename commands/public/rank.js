const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { ranks } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Display your rank or another user\'s rank')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('The user to check rank for')
                .setRequired(false)),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild.members.cache.get(user.id);
        
        const userRank = ranks.getUserRank(user.id, interaction.guild.id);
        const level = userRank.level;
        const xp = userRank.xp;
        const xpNeeded = 5 * Math.pow(level, 2) + 50 * level + 100;
        const progress = xp / xpNeeded;
        
        const canvas = createCanvas(800, 300);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#23272A';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#2C2F33';
        ctx.fillRect(25, 25, canvas.width - 50, canvas.height - 50);
        
        const avatarSize = 150;
        const avatarX = 50;
        const avatarY = canvas.height / 2 - avatarSize / 2;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        
        const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 512 }));
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
        
        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(user.username, 230, 80);
        
        ctx.font = 'bold 60px Arial';
        ctx.fillStyle = '#7289DA';
        ctx.fillText(`Level ${level}`, 230, 150);
        
        ctx.font = '30px Arial';
        ctx.fillStyle = '#99AAB5';
        ctx.fillText(`XP: ${xp}/${xpNeeded}`, 230, 190);
        
        const barWidth = 500;
        const barHeight = 30;
        const barX = 230;
        const barY = 220;
        
        ctx.fillStyle = '#484B4E';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = '#7289DA';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        const rankIcons = ['🥇', '🥈', '🥉', '🏅', '🎖️'];
        const rankIcon = level < rankIcons.length ? rankIcons[level] : '⭐';
        
        ctx.font = '60px Arial';
        ctx.fillText(rankIcon, 700, 150);
        
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
        
        await interaction.editReply({ files: [attachment] });
    }
};