const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { checkPermissions } = require('../../utils/permissions');
const { giveaways } = require('../../utils/database');
const ms = require('ms');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway-start')
        .setDescription('Start a new giveaway')
        .addStringOption(option => 
            option.setName('prize')
                .setDescription('The prize for the giveaway')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('duration')
                .setDescription('The duration of the giveaway (e.g., 1h, 1d, 1w)')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('winners')
                .setDescription('The number of winners')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(10))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send the giveaway to (defaults to current channel)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('Additional description for the giveaway')
                .setRequired(false))
        .addRoleOption(option => 
            option.setName('required-role')
                .setDescription('Role required to enter the giveaway')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        if (!checkPermissions(interaction, [PermissionFlagsBits.ManageGuild])) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Permission Denied', 'You need the Manage Server permission to use this command.')],
                ephemeral: true
            });
        }
        
        const prize = interaction.options.getString('prize');
        const durationString = interaction.options.getString('duration');
        const winnerCount = interaction.options.getInteger('winners');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const description = interaction.options.getString('description');
        const requiredRole = interaction.options.getRole('required-role');
        
        try {
            // Parse duration
            const duration = ms(durationString);
            
            if (!duration || duration < 10000) { // Minimum 10 seconds
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Invalid Duration', 'Please provide a valid duration (minimum 10 seconds).')],
                    ephemeral: true
                });
            }
            
            // Calculate end time
            const endTime = Date.now() + duration;
            
            // Create giveaway embed
            const embed = createInfoEmbed(
                '🎉 GIVEAWAY 🎉',
                `**Prize:** ${prize}`
            )
            .setColor('#FF00FF')
            .addFields(
                { name: 'Ends At', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
                { name: 'Winners', value: `${winnerCount}`, inline: true },
                { name: 'Hosted By', value: `${interaction.user}`, inline: true },
                { name: 'Entries', value: '0', inline: true }
            );
            
            if (description) {
                embed.setDescription(`${description}\n\n**Prize:** ${prize}`);
            }
            
            if (requiredRole) {
                embed.addFields({ name: 'Required Role', value: `${requiredRole}`, inline: true });
            }
            
            // Create button
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('giveaway_enter')
                        .setLabel('Enter Giveaway')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🎉')
                );
            
            // Send giveaway message
            const message = await channel.send({ embeds: [embed], components: [row] });
            
            // Store giveaway in database
            const giveaway = {
                messageId: message.id,
                channelId: channel.id,
                guildId: interaction.guild.id,
                prize,
                description,
                winnerCount,
                endTime,
                hostId: interaction.user.id,
                participants: [],
                ended: false,
                requiredRoleId: requiredRole ? requiredRole.id : null
            };
            
            giveaways.createGiveaway(giveaway);
            
            // Schedule giveaway end
            setTimeout(() => {
                endGiveaway(interaction.client, giveaway);
            }, duration);
            
            const confirmEmbed = createSuccessEmbed(
                'Giveaway Started',
                `Giveaway for **${prize}** has been started in ${channel}.`
            )
            .addFields(
                { name: 'Duration', value: durationString, inline: true },
                { name: 'Winners', value: `${winnerCount}`, inline: true },
                { name: 'Ends At', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true }
            );
            
            await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
        } catch (error) {
            console.error('Error starting giveaway:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while starting the giveaway.')],
                ephemeral: true
            });
        }
    },
    
    async handleButton(interaction) {
        if (interaction.customId !== 'giveaway_enter') {
            return;
        }
        
        try {
            // Get giveaway data
            const giveaway = giveaways.getGiveawayByMessageId(interaction.message.id);
            
            if (!giveaway) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Giveaway Not Found', 'This giveaway no longer exists.')],
                    ephemeral: true
                });
            }
            
            if (giveaway.ended) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Giveaway Ended', 'This giveaway has already ended.')],
                    ephemeral: true
                });
            }
            
            // Check if user has required role
            if (giveaway.requiredRoleId) {
                const member = await interaction.guild.members.fetch(interaction.user.id);
                
                if (!member.roles.cache.has(giveaway.requiredRoleId)) {
                    const role = interaction.guild.roles.cache.get(giveaway.requiredRoleId);
                    
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Missing Required Role', `You need the ${role} role to enter this giveaway.`)],
                        ephemeral: true
                    });
                }
            }
            
            // Check if user already entered
            if (giveaway.participants.includes(interaction.user.id)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Already Entered', 'You have already entered this giveaway.')],
                    ephemeral: true
                });
            }
            
            // Add user to participants
            giveaway.participants.push(interaction.user.id);
            giveaways.updateGiveaway(giveaway);
            
            // Update embed
            const embed = interaction.message.embeds[0];
            const embedData = {
                title: embed.title,
                description: embed.description,
                color: embed.color,
                fields: [...embed.fields]
            };
            
            // Update entries field
            const entriesFieldIndex = embedData.fields.findIndex(field => field.name === 'Entries');
            if (entriesFieldIndex !== -1) {
                embedData.fields[entriesFieldIndex] = { 
                    name: 'Entries', 
                    value: `${giveaway.participants.length}`,
                    inline: true
                };
            }
            
            const updatedEmbed = createInfoEmbed(
                embedData.title,
                embedData.description
            )
            .setColor(embedData.color);
            
            for (const field of embedData.fields) {
                updatedEmbed.addFields(field);
            }
            
            await interaction.message.edit({ embeds: [updatedEmbed] });
            
            await interaction.reply({ 
                embeds: [createSuccessEmbed('Entered Giveaway', `You have entered the giveaway for **${giveaway.prize}**!`)],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error entering giveaway:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while entering the giveaway.')],
                ephemeral: true
            });
        }
    }
};

async function endGiveaway(client, giveaway) {
    try {
        // Check if giveaway already ended
        const currentGiveaway = giveaways.getGiveawayById(giveaway.id);
        
        if (!currentGiveaway || currentGiveaway.ended) {
            return;
        }
        
        // Mark giveaway as ended
        currentGiveaway.ended = true;
        giveaways.updateGiveaway(currentGiveaway);
        
        // Get channel and message
        const guild = await client.guilds.fetch(currentGiveaway.guildId);
        const channel = await guild.channels.fetch(currentGiveaway.channelId);
        const message = await channel.messages.fetch(currentGiveaway.messageId);
        
        // Select winners
        const winners = [];
        const participants = currentGiveaway.participants;
        
        if (participants.length === 0) {
            // No participants
            const noWinnersEmbed = createErrorEmbed(
                '🎉 GIVEAWAY ENDED 🎉',
                `**Prize:** ${currentGiveaway.prize}\n\nNo one entered the giveaway.`
            )
            .setColor('#FF0000');
            
            await message.edit({ embeds: [noWinnersEmbed], components: [] });
            
            await channel.send({ 
                embeds: [createErrorEmbed('Giveaway Ended', `No one entered the giveaway for **${currentGiveaway.prize}**.`)]
            });
            
            return;
        }
        
        // Select winners randomly
        const winnerCount = Math.min(currentGiveaway.winnerCount, participants.length);
        
        for (let i = 0; i < winnerCount; i++) {
            const randomIndex = Math.floor(Math.random() * participants.length);
            const winnerId = participants[randomIndex];
            
            winners.push(winnerId);
            participants.splice(randomIndex, 1);
        }
        
        // Update giveaway message
        const winnersList = winners.map(id => `<@${id}>`).join(', ');
        
        const endedEmbed = createSuccessEmbed(
            '🎉 GIVEAWAY ENDED 🎉',
            `**Prize:** ${currentGiveaway.prize}`
        )
        .setColor('#00FF00')
        .addFields(
            { name: 'Winners', value: winnersList, inline: false },
            { name: 'Hosted By', value: `<@${currentGiveaway.hostId}>`, inline: true },
            { name: 'Entries', value: `${currentGiveaway.participants.length}`, inline: true },
            { name: 'Ended', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        );
        
        if (currentGiveaway.description) {
            endedEmbed.setDescription(`${currentGiveaway.description}\n\n**Prize:** ${currentGiveaway.prize}`);
        }
        
        await message.edit({ embeds: [endedEmbed], components: [] });
        
        // Send winner announcement
        const winnerEmbed = createSuccessEmbed(
            '🎉 Giveaway Winners 🎉',
            `Congratulations to the winners of the **${currentGiveaway.prize}** giveaway!`
        )
        .addFields({ name: 'Winners', value: winnersList });
        
        await channel.send({ 
            content: `Congratulations ${winnersList}! You won the giveaway for **${currentGiveaway.prize}**!`,
            embeds: [winnerEmbed]
        });
    } catch (error) {
        console.error('Error ending giveaway:', error);
    }
}