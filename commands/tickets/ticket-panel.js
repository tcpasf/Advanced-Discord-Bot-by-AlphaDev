const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { tickets } = require('../../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Create a ticket panel with buttons for users to create tickets')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send the ticket panel to')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('title')
                .setDescription('The title of the ticket panel')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('The description of the ticket panel')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('style')
                .setDescription('The style of the ticket panel')
                .setRequired(false)
                .addChoices(
                    { name: 'Default', value: 'default' },
                    { name: 'Buttons Only', value: 'buttons' },
                    { name: 'Dropdown Only', value: 'dropdown' },
                    { name: 'Compact', value: 'compact' },
                    { name: 'Detailed', value: 'detailed' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            const channel = interaction.options.getChannel('channel');
            const title = interaction.options.getString('title') || 'Support Tickets';
            const description = interaction.options.getString('description') || 
                'Need help? Click one of the buttons below to create a support ticket. Our team will assist you as soon as possible.';
            const style = interaction.options.getString('style') || 'default';
            
            // Check if the bot has permission to send messages in the channel
            if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Permission Error', `I don't have permission to send messages in ${channel}.`)],
                    ephemeral: true
                });
            }
            
            // Get ticket settings
            const settings = tickets.getConfig(interaction.guild.id);
            
            // Update panel message and channel IDs in settings
            settings.panelChannelId = channel.id;
            tickets.setConfig(interaction.guild.id, settings);
            
            // Create the ticket panel embed
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle(`📝 ${title}`)
                .setDescription(description);
            
            if (style === 'detailed' || style === 'default') {
                embed.addFields(
                    { name: 'General Support', value: 'Questions about the server, rules, or general assistance.', inline: true },
                    { name: 'Report a User', value: 'Report rule violations or problematic behavior.', inline: true },
                    { name: 'Technical Help', value: 'Issues with bots, roles, or server features.', inline: true },
                    { name: 'Suggestions', value: 'Ideas to improve the server or community.', inline: true },
                    { name: 'Contact Staff', value: 'Private matters that require staff attention.', inline: true },
                    { name: 'Other', value: 'Any other issues not covered by the categories above.', inline: true }
                );
            }
            
            if (style === 'detailed') {
                embed.addFields(
                    { name: 'How it works', value: 'When you create a ticket, a private channel will be created where you can discuss your issue with our staff team. Please provide as much detail as possible to help us assist you efficiently.' },
                    { name: 'Response Time', value: 'Our team will respond as soon as possible. Please be patient, especially during busy periods or off-hours.' }
                );
            }
            
            embed.setFooter({ text: 'Support System • Click a button below to create a ticket' });
            
            // Create components based on the selected style
            const components = [];
            
            if (style === 'default' || style === 'buttons' || style === 'compact') {
                // Create button row(s)
                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_create_general')
                        .setLabel('General Support')
                        .setEmoji('❓')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ticket_create_report')
                        .setLabel('Report User')
                        .setEmoji('🚨')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('ticket_create_technical')
                        .setLabel('Technical Help')
                        .setEmoji('🔧')
                        .setStyle(ButtonStyle.Secondary)
                );
                
                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_create_suggestion')
                        .setLabel('Suggestion')
                        .setEmoji('💡')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('ticket_create_staff')
                        .setLabel('Contact Staff')
                        .setEmoji('👮')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ticket_create_other')
                        .setLabel('Other')
                        .setEmoji('📋')
                        .setStyle(ButtonStyle.Secondary)
                );
                
                components.push(row1);
                if (style !== 'compact') {
                    components.push(row2);
                }
            }
            
            if (style === 'default' || style === 'dropdown' || style === 'compact') {
                // Create dropdown menu
                const selectMenu = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('ticket_category_select')
                        .setPlaceholder('Select ticket category...')
                        .addOptions([
                            {
                                label: 'General Support',
                                description: 'Questions about the server or general help',
                                value: 'general',
                                emoji: '❓'
                            },
                            {
                                label: 'Report a User',
                                description: 'Report rule violations or problematic behavior',
                                value: 'report',
                                emoji: '🚨'
                            },
                            {
                                label: 'Technical Help',
                                description: 'Issues with bots, roles, or server features',
                                value: 'technical',
                                emoji: '🔧'
                            },
                            {
                                label: 'Suggestion',
                                description: 'Ideas to improve the server or community',
                                value: 'suggestion',
                                emoji: '💡'
                            },
                            {
                                label: 'Contact Staff',
                                description: 'Private matters that require staff attention',
                                value: 'staff',
                                emoji: '👮'
                            },
                            {
                                label: 'Other',
                                description: 'Any other issues not covered by the categories above',
                                value: 'other',
                                emoji: '📋'
                            }
                        ])
                );
                
                components.push(selectMenu);
            }
            
            // Send the ticket panel
            const message = await channel.send({ 
                embeds: [embed],
                components: components
            });
            
            // Update panel message ID in settings
            settings.panelMessageId = message.id;
            tickets.setConfig(interaction.guild.id, settings);
            
            // Send confirmation
            await interaction.reply({ 
                embeds: [createSuccessEmbed('Ticket Panel Created', `A ticket panel has been created in ${channel}.`)],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error creating ticket panel:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while creating the ticket panel.')],
                ephemeral: true
            });
        }
    }
};