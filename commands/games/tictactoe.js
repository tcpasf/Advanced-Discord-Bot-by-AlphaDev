const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createInfoEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Play a game of Tic Tac Toe')
        .addUserOption(option => 
            option.setName('opponent')
                .setDescription('The user to play against')
                .setRequired(true)),
    
    async execute(interaction) {
        const opponent = interaction.options.getUser('opponent');
        
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
            currentTurn: interaction.user.id,
            board: [
                [null, null, null],
                [null, null, null],
                [null, null, null]
            ],
            gameOver: false,
            winner: null,
            turnCount: 0
        };
        
        const embed = createInfoEmbed(
            'Tic Tac Toe',
            `${interaction.user} has challenged ${opponent} to a game of Tic Tac Toe!\n\n${opponent}, do you accept this challenge?`
        )
        .addFields(
            { name: 'Player X', value: `${interaction.user}`, inline: true },
            { name: 'Player O', value: `${opponent}`, inline: true }
        );
        
        const acceptRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`ttt_accept_${interaction.user.id}_${opponent.id}`)
                    .setLabel('Accept Challenge')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`ttt_decline_${interaction.user.id}_${opponent.id}`)
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
                            `${opponent} did not respond to the Tic Tac Toe challenge.`
                        );
                        
                        message.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                        interaction.client.games.delete(message.id);
                    }
                }
            }, 60000) // 1 minute timeout
        });
    },
    
    async handleButton(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('ttt_accept_')) {
            await handleAccept(interaction);
        } else if (customId.startsWith('ttt_decline_')) {
            await handleDecline(interaction);
        } else if (customId.startsWith('ttt_move_')) {
            await handleMove(interaction);
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
        'Tic Tac Toe',
        `Game started! ${gameData.challenger} (X) vs ${gameData.opponent} (O)\n\nIt's ${gameData.challenger}'s turn.`
    )
    .addFields(
        { name: 'Player X', value: `${gameData.challenger}`, inline: true },
        { name: 'Player O', value: `${gameData.opponent}`, inline: true }
    );
    
    const rows = createBoardButtons(gameData.game);
    
    await interaction.update({ embeds: [embed], components: rows });
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
        `${interaction.user} has declined the Tic Tac Toe challenge.`
    );
    
    await interaction.update({ embeds: [embed], components: [] });
}

async function handleMove(interaction) {
    const parts = interaction.customId.split('_');
    const row = parseInt(parts[2]);
    const col = parseInt(parts[3]);
    
    const gameData = interaction.client.games.get(interaction.message.id);
    
    if (!gameData) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Game Not Found', 'This game no longer exists.')],
            ephemeral: true
        });
    }
    
    const game = gameData.game;
    
    if (game.gameOver) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Game Over', 'This game has already ended.')],
            ephemeral: true
        });
    }
    
    if (interaction.user.id !== game.currentTurn) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Not Your Turn', 'It\'s not your turn.')],
            ephemeral: true
        });
    }
    
    if (game.board[row][col] !== null) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Invalid Move', 'This cell is already taken.')],
            ephemeral: true
        });
    }
    
    // Make the move
    game.board[row][col] = game.players.indexOf(interaction.user.id);
    game.turnCount++;
    
    // Check for win or draw
    const winner = checkWinner(game.board);
    
    if (winner !== null) {
        game.gameOver = true;
        game.winner = winner;
        
        const winnerUser = winner === 0 ? gameData.challenger : gameData.opponent;
        
        const embed = createSuccessEmbed(
            'Tic Tac Toe - Game Over',
            `${winnerUser} has won the game!`
        )
        .addFields(
            { name: 'Player X', value: `${gameData.challenger}`, inline: true },
            { name: 'Player O', value: `${gameData.opponent}`, inline: true },
            { name: 'Winner', value: `${winnerUser}`, inline: true }
        );
        
        const rows = createBoardButtons(game, true);
        
        await interaction.update({ embeds: [embed], components: rows });
        
        // Clean up the game
        interaction.client.games.delete(interaction.message.id);
        return;
    }
    
    if (game.turnCount === 9) {
        game.gameOver = true;
        
        const embed = createInfoEmbed(
            'Tic Tac Toe - Game Over',
            `The game ended in a draw!`
        )
        .addFields(
            { name: 'Player X', value: `${gameData.challenger}`, inline: true },
            { name: 'Player O', value: `${gameData.opponent}`, inline: true },
            { name: 'Result', value: 'Draw', inline: true }
        );
        
        const rows = createBoardButtons(game, true);
        
        await interaction.update({ embeds: [embed], components: rows });
        
        // Clean up the game
        interaction.client.games.delete(interaction.message.id);
        return;
    }
    
    // Switch turns
    game.currentTurn = game.players[1 - game.players.indexOf(interaction.user.id)];
    
    const nextPlayer = game.currentTurn === gameData.challenger.id ? gameData.challenger : gameData.opponent;
    
    const embed = createInfoEmbed(
        'Tic Tac Toe',
        `Game in progress! ${gameData.challenger} (X) vs ${gameData.opponent} (O)\n\nIt's ${nextPlayer}'s turn.`
    )
    .addFields(
        { name: 'Player X', value: `${gameData.challenger}`, inline: true },
        { name: 'Player O', value: `${gameData.opponent}`, inline: true },
        { name: 'Turn', value: `${nextPlayer}`, inline: true }
    );
    
    const rows = createBoardButtons(game);
    
    await interaction.update({ embeds: [embed], components: rows });
}

function createBoardButtons(game, disableAll = false) {
    const rows = [];
    
    for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        
        for (let j = 0; j < 3; j++) {
            const cell = game.board[i][j];
            
            const button = new ButtonBuilder()
                .setCustomId(`ttt_move_${i}_${j}`)
                .setStyle(ButtonStyle.Secondary);
            
            if (cell === 0) {
                button.setLabel('X').setStyle(ButtonStyle.Primary);
            } else if (cell === 1) {
                button.setLabel('O').setStyle(ButtonStyle.Danger);
            } else {
                button.setLabel('\u2800'); // Using Unicode Braille Pattern Blank (invisible but valid)
            }
            
            if (cell !== null || disableAll) {
                button.setDisabled(true);
            }
            
            row.addComponents(button);
        }
        
        rows.push(row);
    }
    
    return rows;
}

function checkWinner(board) {
    // Check rows
    for (let i = 0; i < 3; i++) {
        if (board[i][0] !== null && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
            return board[i][0];
        }
    }
    
    // Check columns
    for (let j = 0; j < 3; j++) {
        if (board[0][j] !== null && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
            return board[0][j];
        }
    }
    
    // Check diagonals
    if (board[0][0] !== null && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
        return board[0][0];
    }
    
    if (board[0][2] !== null && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
        return board[0][2];
    }
    
    return null;
}