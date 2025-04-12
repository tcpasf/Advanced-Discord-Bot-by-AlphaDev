const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed, createInfoEmbed } = require('../../utils/embeds');
const { tickets } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-advanced')
        .setDescription('Create an advanced ticket panel with multiple options')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send the ticket panel to')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            
            // Check if the bot has permission to send messages in the channel
            if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Permission Error', `I don't have permission to send messages in ${channel}.`)],
                    ephemeral: true
                });
            }
            
            // Create the main embed
            const mainEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('🎫 Advanced Support System')
                .setDescription('Welcome to our support system. Please select the appropriate option below to get help with your issue.')
                .addFields(
                    { name: 'How it works', value: 'When you create a ticket, a private channel will be created where you can discuss your issue with our staff team.' }
                )
                .setFooter({ text: 'Support System • Click a button below to get help' });
            
            // Create the buttons for different ticket types
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create_general')
                    .setLabel('General Help')
                    .setEmoji('❓')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_create_report')
                    .setLabel('Report User')
                    .setEmoji('🚨')
                    .setStyle(ButtonStyle.Danger)
            );
            
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create_technical')
                    .setLabel('Technical Support')
                    .setEmoji('🔧')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_create_suggestion')
                    .setLabel('Suggestion')
                    .setEmoji('💡')
                    .setStyle(ButtonStyle.Success)
            );
            
            // Send the main panel
            await channel.send({ embeds: [mainEmbed], components: [row1, row2] });
            
            // Create the developer team embed
            const devEmbed = new EmbedBuilder()
                .setColor('#FF5733')
                .setTitle('👨‍💻 Developer Team Support')
                .setDescription('Need to contact our development team? Select an option below to create a specialized ticket.')
                .addFields(
                    { name: 'When to use', value: 'Use these options for technical issues, bug reports, or feature requests related to our systems and applications.' }
                )
                .setFooter({ text: 'Developer Support • Technical issues only' });
            
            // Create the buttons for developer team tickets
            const devRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create_bug')
                    .setLabel('Report Bug')
                    .setEmoji('🐛')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('ticket_create_feature')
                    .setLabel('Feature Request')
                    .setEmoji('✨')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('ticket_create_dev')
                    .setLabel('Developer Help')
                    .setEmoji('💻')
                    .setStyle(ButtonStyle.Primary)
            );
            
            // Send the developer panel
            await channel.send({ embeds: [devEmbed], components: [devRow] });
            
            // Create the staff contact embed
            const staffEmbed = new EmbedBuilder()
                .setColor('#33A8FF')
                .setTitle('👮 Staff Contact')
                .setDescription('Need to speak with our staff team directly? Use the options below to create a private ticket.')
                .addFields(
                    { name: 'When to use', value: 'Use these options for sensitive matters, appeals, or issues that require direct staff attention.' }
                )
                .setFooter({ text: 'Staff Contact • For important matters only' });
            
            // Create the buttons for staff contact tickets
            const staffRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_create_staff')
                    .setLabel('Contact Staff')
                    .setEmoji('👮')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('ticket_create_appeal')
                    .setLabel('Appeal')
                    .setEmoji('⚖️')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('ticket_create_other')
                    .setLabel('Other')
                    .setEmoji('📋')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            // Send the staff panel
            await channel.send({ embeds: [staffEmbed], components: [staffRow] });
            
            // Send confirmation
            await interaction.reply({ 
                embeds: [createSuccessEmbed('Advanced Ticket Panels Created', `Advanced ticket panels have been created in ${channel}.`)],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error creating advanced ticket panels:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while creating the advanced ticket panels.')],
                ephemeral: true
            });
        }
    }
};