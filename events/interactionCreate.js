const { Events } = require('discord.js');
const { createErrorEmbed } = require('../utils/embeds');
const { translate } = require('../utils/translations');
const TranslationHelper = require('../utils/translationHelper');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                // Create a translation helper for this interaction
                const t = TranslationHelper.fromInteraction(interaction);
                
                // Pass both the interaction and the translation helper
                await command.execute(interaction, t);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);
                
                const guildId = interaction.guild ? interaction.guild.id : null;
                const errorTitle = translate('common.error', guildId);
                const errorMessage = translate('errors.command_error', guildId);
                
                const errorEmbed = createErrorEmbed(errorTitle, errorMessage);
                
                const reply = { embeds: [errorEmbed], ephemeral: true };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }
        
        else if (interaction.isButton()) {
            // Extract the command name from the customId
            const customIdParts = interaction.customId.split('_');
            let commandName = null;
            
            // Handle avatar and server buttons
            if (interaction.customId.startsWith('avatar_') || interaction.customId.startsWith('server_')) {
                commandName = 'avatar';
            }
            // Handle invite and support buttons
            else if (interaction.customId === 'invite_link' || interaction.customId === 'support_link') {
                commandName = 'invite';
            }
            // Handle VIP buttons
            else if (interaction.customId.startsWith('vip_')) {
                commandName = 'vip';
            }
            // Handle help menu buttons
            else if (interaction.customId.startsWith('help_')) {
                commandName = 'help';
            }
            // Handle help-menu buttons
            else if (interaction.customId.startsWith('help-menu_')) {
                commandName = 'help-menu';
            }
            // Handle dashboard buttons
            else if (interaction.customId.startsWith('dashboard_')) {
                commandName = 'dashboard';
            }
            // Handle commands menu buttons
            else if (interaction.customId.startsWith('commands_')) {
                commandName = 'commands';
            }
            // Handle about buttons
            else if (interaction.customId.startsWith('about_')) {
                commandName = 'about';
            }
            // Handle game buttons
            else if (interaction.customId.startsWith('ttt_')) {
                commandName = 'tictactoe';
            }
            else if (interaction.customId.startsWith('hangman_')) {
                commandName = 'hangman';
            }
            else if (interaction.customId.startsWith('rps_')) {
                commandName = 'rps';
            }
            else if (interaction.customId.startsWith('connect4_')) {
                commandName = 'connect4';
            }
            else if (interaction.customId.startsWith('blackjack_')) {
                commandName = 'blackjack';
            }
            else if (interaction.customId.startsWith('ms_')) {
                commandName = 'minesweeper';
            }
            // Handle giveaway buttons
            else if (interaction.customId.startsWith('giveaway_')) {
                commandName = 'giveaway-start';
            }
            // Handle ticket buttons
            else if (interaction.customId.startsWith('ticket_')) {
                const action = customIdParts[1];
                if (action === 'create') {
                    commandName = 'ticket-create';
                } else if (action === 'close') {
                    commandName = 'ticket-close';
                } else if (action === 'claim') {
                    commandName = 'ticket-claim';
                } else if (action === 'transcript') {
                    commandName = 'ticket-transcript';
                } else if (action === 'add' || action === 'remove' || action === 'priority') {
                    commandName = 'ticket-create';
                } else {
                    commandName = 'ticket-setup';
                }
            }
            
            if (commandName) {
                const command = interaction.client.commands.get(commandName);
                if (command && command.handleButton) {
                    try {
                        // Create a translation helper for this interaction
                        const t = TranslationHelper.fromInteraction(interaction);
                        
                        // Pass both the interaction and the translation helper
                        await command.handleButton(interaction, t);
                    } catch (error) {
                        console.error(`Error handling button interaction for ${commandName}:`, error);
                        
                        // Check if the error is about the interaction already being replied to
                        if (error.code === 'InteractionAlreadyReplied') {
                            console.log(`Interaction for ${commandName} was already replied to. Ignoring error.`);
                        } else if (!interaction.replied && !interaction.deferred) {
                            // Only try to reply if the interaction hasn't been replied to already
                            try {
                                const t = TranslationHelper.fromInteraction(interaction);
                                await interaction.reply({ 
                                    embeds: [createErrorEmbed(
                                        t.get('common.error'),
                                        t.get('errors.button_error')
                                    )], 
                                    ephemeral: true 
                                });
                            } catch (replyError) {
                                console.error('Error sending error message:', replyError);
                            }
                        }
                    }
                }
            }
        }
        
        else if (interaction.isStringSelectMenu()) {
            // Handle select menu interactions
            let commandName = null;
            
            if (interaction.customId === 'help_category' || interaction.customId === 'help_back') {
                commandName = 'help';
            }
            // Handle help-menu select menu interactions
            else if (interaction.customId.startsWith('help-menu_')) {
                commandName = 'help-menu';
            }
            // Handle ticket select menu interactions
            else if (interaction.customId === 'ticket_category_select') {
                commandName = 'ticket-create';
            }
            else if (interaction.customId === 'ticket_priority_select' || interaction.customId.startsWith('ticket_priority_select_')) {
                commandName = 'ticket-create';
            }
            
            if (commandName) {
                const command = interaction.client.commands.get(commandName);
                if (command && command.handleSelectMenu) {
                    try {
                        // Create a translation helper for this interaction
                        const t = TranslationHelper.fromInteraction(interaction);
                        
                        // Pass both the interaction and the translation helper
                        await command.handleSelectMenu(interaction, t);
                    } catch (error) {
                        console.error(`Error handling select menu interaction for ${commandName}:`, error);
                        
                        // Check if the error is about the interaction already being replied to
                        if (error.code === 'InteractionAlreadyReplied') {
                            console.log(`Interaction for ${commandName} was already replied to. Ignoring error.`);
                        } else if (!interaction.replied && !interaction.deferred) {
                            try {
                                const t = TranslationHelper.fromInteraction(interaction);
                                await interaction.reply({ 
                                    embeds: [createErrorEmbed(
                                        t.get('common.error'),
                                        t.get('errors.menu_error')
                                    )], 
                                    ephemeral: true 
                                });
                            } catch (replyError) {
                                console.error('Error sending error message:', replyError);
                            }
                        }
                    }
                }
            }
        }
        
        else if (interaction.isModalSubmit()) {
            // Handle modal submissions
            const customIdParts = interaction.customId.split('_');
            let commandName = customIdParts[0];
            
            // Special handling for ticket modals
            if (commandName === 'ticket') {
                const action = customIdParts[1];
                if (action === 'close') {
                    commandName = 'ticket-close';
                } else if (action === 'create') {
                    commandName = 'ticket-create';
                } else if (action === 'priority' || action === 'add' || action === 'remove') {
                    commandName = 'ticket-create';
                }
            }
            
            const command = interaction.client.commands.get(commandName);
            if (command && command.handleModalSubmit) {
                try {
                    // Create a translation helper for this interaction
                    const t = TranslationHelper.fromInteraction(interaction);
                    
                    // Pass both the interaction and the translation helper
                    await command.handleModalSubmit(interaction, t);
                } catch (error) {
                    console.error(`Error handling modal submission for ${commandName}:`, error);
                    
                    // Check if the error is about the interaction already being replied to
                    if (error.code === 'InteractionAlreadyReplied') {
                        console.log(`Interaction for ${commandName} was already replied to. Ignoring error.`);
                    } else if (!interaction.replied && !interaction.deferred) {
                        try {
                            const t = TranslationHelper.fromInteraction(interaction);
                            await interaction.reply({ 
                                embeds: [createErrorEmbed(
                                    t.get('common.error'),
                                    t.get('errors.form_error')
                                )], 
                                ephemeral: true 
                            });
                        } catch (replyError) {
                            console.error('Error sending error message:', replyError);
                        }
                    }
                }
            }
        }
    },
};