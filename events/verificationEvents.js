const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { verification } = require('../utils/database');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../utils/embeds');
const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs');

// Try to register a font for captchas if available
try {
    registerFont(path.join(__dirname, '..', 'assets', 'fonts', 'Roboto-Bold.ttf'), { family: 'Roboto' });
} catch (error) {
    console.log('Font not registered, using system default');
}

// Generate a random captcha code
function generateCaptchaCode(length = 6) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate a captcha image
async function generateCaptchaImage(code, difficulty = 'medium') {
    const width = 300;
    const height = 100;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, width, height);
    
    // Add noise based on difficulty
    const noiseLevel = difficulty === 'easy' ? 100 : difficulty === 'medium' ? 500 : 1000;
    for (let i = 0; i < noiseLevel; i++) {
        ctx.fillStyle = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.1)`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
    }
    
    // Add lines based on difficulty
    const lineCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 10;
    for (let i = 0; i < lineCount; i++) {
        ctx.strokeStyle = `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }
    
    // Draw text
    ctx.font = '38px Roboto, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw each character with random rotation and color
    for (let i = 0; i < code.length; i++) {
        const x = 40 + i * 40;
        const y = height / 2 + Math.random() * 10 - 5;
        const rotation = difficulty === 'easy' ? 0 : (Math.random() * 0.4 - 0.2);
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillStyle = `rgb(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)})`;
        ctx.fillText(code[i], 0, 0);
        ctx.restore();
    }
    
    return canvas.toBuffer();
}

module.exports = {
    name: 'interactionCreate',
    once: false,
    async execute(interaction) {
        // Handle verification button clicks
        if (interaction.isButton() && interaction.customId === 'verify_button') {
            try {
                const settings = verification.getSettings(interaction.guild.id);
                
                // Check if verification is enabled
                if (!settings.enabled) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Verification Disabled', 'The verification system is currently disabled.')],
                        ephemeral: true
                    });
                }
                
                // Check if user is already verified
                if (verification.isVerified(interaction.user.id, interaction.guild.id)) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Already Verified', 'You are already verified in this server.')],
                        ephemeral: true
                    });
                }
                
                // Check verification method
                if (settings.method === 'captcha') {
                    // Generate captcha
                    const captchaCode = generateCaptchaCode();
                    const captchaImage = await generateCaptchaImage(captchaCode, verification.getCaptchaSettings().difficulty);
                    
                    // Store captcha data
                    verification.createVerification(interaction.user.id, interaction.guild.id, {
                        code: captchaCode,
                        attempts: 0,
                        maxAttempts: 3
                    });
                    
                    // Create captcha embed
                    const embed = createInfoEmbed(
                        'Verification Captcha',
                        'Please enter the code shown in the image below to verify yourself.'
                    )
                    .setImage('attachment://captcha.png');
                    
                    // Create verify button
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('verify_submit')
                                .setLabel('Submit Code')
                                .setStyle(ButtonStyle.Primary)
                        );
                    
                    // Send captcha
                    await interaction.reply({ 
                        embeds: [embed],
                        files: [{ attachment: captchaImage, name: 'captcha.png' }],
                        components: [row],
                        ephemeral: true
                    });
                } else if (settings.method === 'button') {
                    // Simple button verification
                    await handleVerification(interaction);
                } else {
                    // Unsupported method
                    await interaction.reply({ 
                        embeds: [createErrorEmbed('Verification Error', 'This verification method is not supported.')],
                        ephemeral: true
                    });
                }
            } catch (error) {
                console.error('Error handling verification button:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Verification Error', 'An error occurred while processing your verification request.')],
                    ephemeral: true
                });
            }
        }
        // Handle captcha submission button
        else if (interaction.isButton() && interaction.customId === 'verify_submit') {
            try {
                // Show captcha input modal
                const modal = new ModalBuilder()
                    .setCustomId('verify_captcha_modal')
                    .setTitle('Verification Captcha');
                
                const codeInput = new TextInputBuilder()
                    .setCustomId('captcha_code')
                    .setLabel('Enter the captcha code')
                    .setPlaceholder('Enter the code from the image')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                    .setMinLength(6)
                    .setMaxLength(6);
                
                const firstRow = new ActionRowBuilder().addComponents(codeInput);
                modal.addComponents(firstRow);
                
                await interaction.showModal(modal);
            } catch (error) {
                console.error('Error showing captcha modal:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Verification Error', 'An error occurred while processing your verification request.')],
                    ephemeral: true
                });
            }
        }
        // Handle captcha modal submission
        else if (interaction.isModalSubmit() && interaction.customId === 'verify_captcha_modal') {
            try {
                const settings = verification.getSettings(interaction.guild.id);
                
                // Get captcha data
                const verificationData = verification.getVerification(interaction.user.id, interaction.guild.id);
                
                if (!verificationData) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Verification Expired', 'Your verification session has expired. Please try again.')],
                        ephemeral: true
                    });
                }
                
                // Get user input
                const userCode = interaction.fields.getTextInputValue('captcha_code').toUpperCase();
                
                // Increment attempts
                verificationData.attempts = (verificationData.attempts || 0) + 1;
                verification.createVerification(interaction.user.id, interaction.guild.id, verificationData);
                
                // Check if code matches
                if (userCode === verificationData.code) {
                    // Verification successful
                    await handleVerification(interaction);
                } else {
                    // Check if max attempts reached
                    if (verificationData.attempts >= verificationData.maxAttempts) {
                        // Remove verification data
                        verification.removeVerification(interaction.user.id, interaction.guild.id);
                        
                        await interaction.reply({ 
                            embeds: [createErrorEmbed('Verification Failed', 'You have exceeded the maximum number of attempts. Please try again later.')],
                            ephemeral: true
                        });
                    } else {
                        // Generate new captcha
                        const captchaCode = generateCaptchaCode();
                        const captchaImage = await generateCaptchaImage(captchaCode, verification.getCaptchaSettings().difficulty);
                        
                        // Update captcha data
                        verification.createVerification(interaction.user.id, interaction.guild.id, {
                            ...verificationData,
                            code: captchaCode
                        });
                        
                        // Create captcha embed
                        const embed = createErrorEmbed(
                            'Incorrect Code',
                            `The code you entered is incorrect. You have ${verificationData.maxAttempts - verificationData.attempts} attempts remaining.\n\nPlease try again with the new code shown below.`
                        )
                        .setImage('attachment://captcha.png');
                        
                        // Create verify button
                        const row = new ActionRowBuilder()
                            .addComponents(
                                new ButtonBuilder()
                                    .setCustomId('verify_submit')
                                    .setLabel('Submit Code')
                                    .setStyle(ButtonStyle.Primary)
                            );
                        
                        // Send new captcha
                        await interaction.reply({ 
                            embeds: [embed],
                            files: [{ attachment: captchaImage, name: 'captcha.png' }],
                            components: [row],
                            ephemeral: true
                        });
                    }
                }
            } catch (error) {
                console.error('Error processing captcha submission:', error);
                
                await interaction.reply({ 
                    embeds: [createErrorEmbed('Verification Error', 'An error occurred while processing your verification request.')],
                    ephemeral: true
                });
            }
        }
    }
};

// Handle successful verification
async function handleVerification(interaction) {
    try {
        const settings = verification.getSettings(interaction.guild.id);
        
        // Get the verified role
        const verifiedRole = interaction.guild.roles.cache.get(settings.verifiedRoleId);
        
        if (!verifiedRole) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Verification Error', 'The verified role no longer exists. Please contact a server administrator.')],
                ephemeral: true
            });
        }
        
        // Get the member
        const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        
        if (!member) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Verification Error', 'Could not find your member data. Please try again later.')],
                ephemeral: true
            });
        }
        
        // Add verified role
        await member.roles.add(verifiedRole);
        
        // Remove unverified role if set
        if (settings.unverifiedRoleId) {
            const unverifiedRole = interaction.guild.roles.cache.get(settings.unverifiedRoleId);
            if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                await member.roles.remove(unverifiedRole);
            }
        }
        
        // Mark as verified in database
        verification.completeVerification(interaction.user.id, interaction.guild.id);
        
        // Log the verification
        if (settings.logChannelId) {
            const logChannel = interaction.guild.channels.cache.get(settings.logChannelId);
            if (logChannel) {
                await logChannel.send({ 
                    embeds: [createSuccessEmbed(
                        'User Verified',
                        `${interaction.user} (${interaction.user.id}) has been verified.\nAccount Age: ${Math.floor((Date.now() - interaction.user.createdAt) / 86400000)} days`
                    )]
                });
            }
        }
        
        // Send success message
        await interaction.reply({ 
            embeds: [createSuccessEmbed(
                'Verification Successful',
                settings.successMessage || 'You have been successfully verified! You now have access to all channels.'
            )],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error handling verification:', error);
        
        await interaction.reply({ 
            embeds: [createErrorEmbed('Verification Error', 'An error occurred while processing your verification.')],
            ephemeral: true
        });
    }
}