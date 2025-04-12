const { EmbedBuilder } = require('discord.js');
const { welcome } = require('../utils/database');
const Canvas = require('canvas');

module.exports = {
    name: 'guildMemberAdd',
    once: false,
    async execute(member) {
        try {
            // Get welcome settings for this guild
            const settings = welcome.getSettings(member.guild.id);
            
            // Check if welcome system is enabled
            if (!settings.enabled) return;
            
            // Check if welcome channel exists
            const welcomeChannel = member.guild.channels.cache.get(settings.channelId);
            if (!welcomeChannel) return;
            
            // Replace placeholders in welcome message
            const welcomeMessage = settings.message
                .replace(/{user}/g, member.toString())
                .replace(/{server}/g, member.guild.name)
                .replace(/{count}/g, member.guild.memberCount.toString());
            
            // Create welcome embed
            const embed = new EmbedBuilder()
                .setColor(settings.color || '#7289DA')
                .setTitle(`Welcome to ${member.guild.name}!`)
                .setDescription(welcomeMessage)
                .setTimestamp();
            
            // Add member information
            embed.addFields(
                { name: 'User', value: `${member.user.tag}`, inline: true },
                { name: 'Member #', value: `${member.guild.memberCount}`, inline: true },
                { name: 'Joined', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
            );
            
            // Set author with member avatar
            embed.setAuthor({
                name: member.user.tag,
                iconURL: member.user.displayAvatarURL({ dynamic: true })
            });
            
            // Set thumbnail with member avatar
            embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
            
            // If image is enabled, create a welcome image
            if (settings.useImage) {
                try {
                    const canvas = Canvas.createCanvas(1024, 500);
                    const ctx = canvas.getContext('2d');
                    
                    // Draw background
                    ctx.fillStyle = '#23272A';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw welcome text
                    ctx.font = 'bold 60px sans-serif';
                    ctx.fillStyle = settings.color || '#7289DA';
                    ctx.textAlign = 'center';
                    ctx.fillText(`Welcome to ${member.guild.name}!`, canvas.width / 2, 100);
                    
                    // Draw username
                    ctx.font = 'bold 40px sans-serif';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(member.user.tag, canvas.width / 2, 180);
                    
                    // Draw member count
                    ctx.font = '30px sans-serif';
                    ctx.fillText(`You are member #${member.guild.memberCount}`, canvas.width / 2, 240);
                    
                    // Draw avatar
                    ctx.beginPath();
                    ctx.arc(canvas.width / 2, 350, 100, 0, Math.PI * 2, true);
                    ctx.closePath();
                    ctx.clip();
                    
                    const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
                    ctx.drawImage(avatar, canvas.width / 2 - 100, 250, 200, 200);
                    
                    const attachment = { attachment: canvas.toBuffer(), name: 'welcome.png' };
                    
                    // Set image in embed
                    embed.setImage('attachment://welcome.png');
                    
                    // Send welcome message with image
                    await welcomeChannel.send({ embeds: [embed], files: [attachment] });
                } catch (error) {
                    console.error('Error creating welcome image:', error);
                    // If image creation fails, send without image
                    await welcomeChannel.send({ embeds: [embed] });
                }
            } else {
                // Send welcome message without image
                await welcomeChannel.send({ embeds: [embed] });
            }
            
            // Send DM if enabled
            if (settings.dmEnabled && settings.dmMessage) {
                try {
                    const dmMessage = settings.dmMessage
                        .replace(/{user}/g, member.user.username)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{count}/g, member.guild.memberCount.toString());
                    
                    const dmEmbed = new EmbedBuilder()
                        .setColor(settings.color || '#7289DA')
                        .setTitle(`Welcome to ${member.guild.name}!`)
                        .setDescription(dmMessage)
                        .setTimestamp();
                    
                    await member.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.error('Error sending welcome DM:', error);
                    // Ignore DM errors (user might have DMs disabled)
                }
            }
            
            // Assign auto roles if configured
            if (settings.roleIds && settings.roleIds.length > 0) {
                try {
                    for (const roleId of settings.roleIds) {
                        const role = member.guild.roles.cache.get(roleId);
                        if (role) {
                            await member.roles.add(role);
                        }
                    }
                } catch (error) {
                    console.error('Error assigning auto roles:', error);
                }
            }
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    }
};