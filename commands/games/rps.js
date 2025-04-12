const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createInfoEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock Paper Scissors')
        .addUserOption(option => 
            option.setName('opponent')
                .setDescription('The user to play against (leave empty to play against the bot)')
                .setRequired(false)),
    
    async execute(interaction) {
        const opponent = interaction.options.getUser('opponent');
        
        if (opponent) {
            // PvP mode
            if (opponent.bot) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Invalid Opponent', 'You cannot play against a bot.')],
                    ephemeral: true
                });
            }
            
            if (opponent.id === interaction.user.id) {
                return interaction.reply({ 
                    embeds: [createErrorEmbed('Invalid Opponent', 'You cannot play against yourself.')],
                    ephemeral: true
                });
            }
            
            const game = {
                players: [interaction.user.id, opponent.id],
                choices: {},
                gameOver: false
            };
            
            const embed = createInfoEmbed(
                'Rock Paper Scissors',
                `${interaction.user} has challenged ${opponent} to a game of Rock Paper Scissors!\n\n${opponent}, do you accept this challenge?`
            );
            
            const acceptRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rps_accept_${interaction.user.id}_${opponent.id}`)
                        .setLabel('Accept Challenge')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`rps_decline_${interaction.user.id}_${opponent.id}`)
                        .setLabel('Decline Challenge')
                        .setStyle(ButtonStyle.Danger)
                );
            
            const message = await interaction.reply({ embeds: [embed], components: [acceptRow], fetchReply: true });
            
            // Store the game state in a collection on the client
            if (!interaction.client.games) {
                interaction.client.games = new Map();
            }
            
            interaction.client.games.set(message.id, {
                game,
                message,
                challenger: interaction.user,
                opponent,
                timeout: setTimeout(() => {
                    if (interaction.client.games.has(message.id)) {
                        const gameData = interaction.client.games.get(message.id);
                        
                        if (!gameData.game.started) {
                            const timeoutEmbed = createErrorEmbed(
                                'Challenge Expired',
                                `${opponent} did not respond to the Rock Paper Scissors challenge.`
                            );
                            
                            message.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                            interaction.client.games.delete(message.id);
                        }
                    }
                }, 60000) // 1 minute timeout
            });
        } else {
            // PvE mode (against bot)
            const embed = createInfoEmbed(
                'Rock Paper Scissors',
                `${interaction.user}, choose your move!`
            );
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`rps_bot_rock_${interaction.user.id}`)
                        .setLabel('Rock')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🪨'),
                    new ButtonBuilder()
                        .setCustomId(`rps_bot_paper_${interaction.user.id}`)
                        .setLabel('Paper')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📄'),
                    new ButtonBuilder()
                        .setCustomId(`rps_bot_scissors_${interaction.user.id}`)
                        .setLabel('Scissors')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('✂️')
                );
            
            await interaction.reply({ embeds: [embed], components: [row] });
        }
    },
    
    async handleButton(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('rps_accept_')) {
            await handleAccept(interaction);
        } else if (customId.startsWith('rps_decline_')) {
            await handleDecline(interaction);
        } else if (customId.startsWith('rps_choice_')) {
            await handleChoice(interaction);
        } else if (customId.startsWith('rps_bot_')) {
            await handleBotGame(interaction);
        }
    }
};

async function handleAccept(interaction) {
    const parts = interaction.customId.split('_');
    const challengerId = parts[2];
    const opponentId = parts[3];
    
    if (interaction.user.id !== opponentId) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Not Your Challenge', 'This challenge is not for you.')],
            ephemeral: true
        });
    }
    
    const gameData = interaction.client.games.get(interaction.message.id);
    
    if (!gameData) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Game Not Found', 'This game no longer exists.')],
            ephemeral: true
        });
    }
    
    clearTimeout(gameData.timeout);
    
    gameData.game.started = true;
    
    const embed = createInfoEmbed(
        'Rock Paper Scissors',
        `${gameData.challenger} vs ${gameData.opponent}\n\nPlease make your choices!`
    );
    
    // Create DM buttons for both players
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`rps_choice_rock_${interaction.message.id}`)
                .setLabel('Rock')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🪨'),
            new ButtonBuilder()
                .setCustomId(`rps_choice_paper_${interaction.message.id}`)
                .setLabel('Paper')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📄'),
            new ButtonBuilder()
                .setCustomId(`rps_choice_scissors_${interaction.message.id}`)
                .setLabel('Scissors')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✂️')
        );
    
    await interaction.update({ 
        embeds: [embed], 
        components: [],
        content: 'Both players have been sent a DM to make their choice.'
    });
    
    // Send DMs to both players
    try {
        await gameData.challenger.send({ 
            embeds: [createInfoEmbed('Rock Paper Scissors', `Make your choice against ${gameData.opponent}!`)],
            components: [row]
        });
    } catch (error) {
        console.error('Could not DM challenger:', error);
        
        await interaction.followUp({ 
            content: `${gameData.challenger}, I couldn't send you a DM. Please make sure your DMs are open.`,
            ephemeral: true
        });
        
        interaction.client.games.delete(interaction.message.id);
        return;
    }
    
    try {
        await gameData.opponent.send({ 
            embeds: [createInfoEmbed('Rock Paper Scissors', `Make your choice against ${gameData.challenger}!`)],
            components: [row]
        });
    } catch (error) {
        console.error('Could not DM opponent:', error);
        
        await interaction.followUp({ 
            content: `${gameData.opponent}, I couldn't send you a DM. Please make sure your DMs are open.`,
            ephemeral: true
        });
        
        interaction.client.games.delete(interaction.message.id);
        return;
    }
    
    // Set a timeout for the game
    gameData.timeout = setTimeout(() => {
        if (interaction.client.games.has(interaction.message.id)) {
            const game = interaction.client.games.get(interaction.message.id);
            
            if (!game.game.gameOver) {
                const timeoutEmbed = createErrorEmbed(
                    'Game Expired',
                    'The Rock Paper Scissors game has expired because one or both players did not make a choice.'
                );
                
                interaction.message.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                interaction.client.games.delete(interaction.message.id);
            }
        }
    }, 60000); // 1 minute timeout
}

async function handleDecline(interaction) {
    const parts = interaction.customId.split('_');
    const challengerId = parts[2];
    const opponentId = parts[3];
    
    if (interaction.user.id !== opponentId) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Not Your Challenge', 'This challenge is not for you.')],
            ephemeral: true
        });
    }
    
    const gameData = interaction.client.games.get(interaction.message.id);
    
    if (gameData) {
        clearTimeout(gameData.timeout);
        interaction.client.games.delete(interaction.message.id);
    }
    
    const embed = createErrorEmbed(
        'Challenge Declined',
        `${interaction.user} has declined the Rock Paper Scissors challenge.`
    );
    
    await interaction.update({ embeds: [embed], components: [] });
}

async function handleChoice(interaction) {
    const parts = interaction.customId.split('_');
    const choice = parts[2];
    const messageId = parts[3];
    
    // This is a DM interaction
    if (!interaction.client.games.has(messageId)) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Game Not Found', 'This game no longer exists or has expired.')],
            ephemeral: true
        });
    }
    
    const gameData = interaction.client.games.get(messageId);
    const game = gameData.game;
    
    if (game.gameOver) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Game Over', 'This game has already ended.')],
            ephemeral: true
        });
    }
    
    if (!game.players.includes(interaction.user.id)) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Not Your Game', 'You are not part of this game.')],
            ephemeral: true
        });
    }
    
    // Record the player's choice
    game.choices[interaction.user.id] = choice;
    
    await interaction.reply({ 
        embeds: [createSuccessEmbed('Choice Made', `You chose ${choice}! Waiting for your opponent...`)],
        ephemeral: true
    });
    
    // Check if both players have made their choices
    if (Object.keys(game.choices).length === 2) {
        game.gameOver = true;
        clearTimeout(gameData.timeout);
        
        const challenger = gameData.challenger;
        const opponent = gameData.opponent;
        
        const challengerChoice = game.choices[challenger.id];
        const opponentChoice = game.choices[opponent.id];
        
        let result;
        let winner;
        
        if (challengerChoice === opponentChoice) {
            result = "It's a tie!";
            winner = null;
        } else if (
            (challengerChoice === 'rock' && opponentChoice === 'scissors') ||
            (challengerChoice === 'paper' && opponentChoice === 'rock') ||
            (challengerChoice === 'scissors' && opponentChoice === 'paper')
        ) {
            result = `${challenger} wins!`;
            winner = challenger;
        } else {
            result = `${opponent} wins!`;
            winner = opponent;
        }
        
        const embed = createInfoEmbed(
            'Rock Paper Scissors - Result',
            result
        )
        .addFields(
            { name: challenger.username, value: getChoiceEmoji(challengerChoice), inline: true },
            { name: 'VS', value: '⚔️', inline: true },
            { name: opponent.username, value: getChoiceEmoji(opponentChoice), inline: true }
        );
        
        if (winner) {
            embed.setColor('#00FF00');
        }
        
        await gameData.message.edit({ embeds: [embed], components: [] });
        
        interaction.client.games.delete(messageId);
    }
}

async function handleBotGame(interaction) {
    const parts = interaction.customId.split('_');
    const choice = parts[2];
    const userId = parts[3];
    
    if (interaction.user.id !== userId) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Not Your Game', 'This is not your game.')],
            ephemeral: true
        });
    }
    
    // Bot makes a random choice
    const botChoices = ['rock', 'paper', 'scissors'];
    const botChoice = botChoices[Math.floor(Math.random() * botChoices.length)];
    
    let result;
    let winner;
    
    if (choice === botChoice) {
        result = "It's a tie!";
        winner = null;
    } else if (
        (choice === 'rock' && botChoice === 'scissors') ||
        (choice === 'paper' && botChoice === 'rock') ||
        (choice === 'scissors' && botChoice === 'paper')
    ) {
        result = `${interaction.user} wins!`;
        winner = interaction.user;
    } else {
        result = `Bot wins!`;
        winner = 'Bot';
    }
    
    const embed = createInfoEmbed(
        'Rock Paper Scissors - Result',
        result
    )
    .addFields(
        { name: interaction.user.username, value: getChoiceEmoji(choice), inline: true },
        { name: 'VS', value: '⚔️', inline: true },
        { name: 'Bot', value: getChoiceEmoji(botChoice), inline: true }
    );
    
    if (winner === interaction.user) {
        embed.setColor('#00FF00');
    } else if (winner === 'Bot') {
        embed.setColor('#FF0000');
    }
    
    await interaction.update({ embeds: [embed], components: [] });
}

function getChoiceEmoji(choice) {
    switch (choice) {
        case 'rock': return '🪨 Rock';
        case 'paper': return '📄 Paper';
        case 'scissors': return '✂️ Scissors';
        default: return '❓ Unknown';
    }
}