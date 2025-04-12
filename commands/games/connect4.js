const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createInfoEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('connect4')
        .setDescription('Play a game of Connect 4')
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
            board: Array(6).fill().map(() => Array(7).fill(null)),
            gameOver: false,
            winner: null,
            turnCount: 0
        };
        
        const embed = createInfoEmbed(
            'Connect 4',
            `${interaction.user} has challenged ${opponent} to a game of Connect 4!\n\n${opponent}, do you accept this challenge?`
        )
        .addFields(
            { name: 'Player 1 (🔴)', value: `${interaction.user}`, inline: true },
            { name: 'Player 2 (🔵)', value: `${opponent}`, inline: true }
        );
        
        const acceptRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`connect4_accept_${interaction.user.id}_${opponent.id}`)
                    .setLabel('Accept Challenge')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`connect4_decline_${interaction.user.id}_${opponent.id}`)
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
                            `${opponent} did not respond to the Connect 4 challenge.`
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
        
        if (customId.startsWith('connect4_accept_')) {
            await handleAccept(interaction);
        } else if (customId.startsWith('connect4_decline_')) {
            await handleDecline(interaction);
        } else if (customId.startsWith('connect4_drop_')) {
            await handleDrop(interaction);
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
        'Connect 4',
        `Game started! ${gameData.challenger} (🔴) vs ${gameData.opponent} (🔵)\n\nIt's ${gameData.challenger}'s turn.`
    )
    .addFields(
        { name: 'Player 1 (🔴)', value: `${gameData.challenger}`, inline: true },
        { name: 'Player 2 (🔵)', value: `${gameData.opponent}`, inline: true }
    );
    
    const rows = createBoardButtons(gameData.game);
    
    await interaction.update({ embeds: [embed], components: rows });
    
    // Set a timeout for the game
    gameData.timeout = setTimeout(() => {
        if (interaction.client.games.has(interaction.message.id)) {
            const game = interaction.client.games.get(interaction.message.id);
            
            if (!game.game.gameOver) {
                const timeoutEmbed = createErrorEmbed(
                    'Game Expired',
                    'The Connect 4 game has expired due to inactivity.'
                );
                
                interaction.message.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                interaction.client.games.delete(interaction.message.id);
            }
        }
    }, 300000); // 5 minute timeout
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
        `${interaction.user} has declined the Connect 4 challenge.`
    );
    
    await interaction.update({ embeds: [embed], components: [] });
}

async function handleDrop(interaction) {
    const parts = interaction.customId.split('_');
    const column = parseInt(parts[2]);
    
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
    
    // Find the lowest empty row in the selected column
    let row = -1;
    for (let r = 5; r >= 0; r--) {
        if (game.board[r][column] === null) {
            row = r;
            break;
        }
    }
    
    if (row === -1) {
        return interaction.reply({ 
            embeds: [createErrorEmbed('Column Full', 'This column is already full.')],
            ephemeral: true
        });
    }
    
    // Make the move
    const playerIndex = game.players.indexOf(interaction.user.id);
    game.board[row][column] = playerIndex;
    game.turnCount++;
    
    // Check for win
    if (checkWin(game.board, row, column, playerIndex)) {
        game.gameOver = true;
        game.winner = playerIndex;
        
        const winnerUser = playerIndex === 0 ? gameData.challenger : gameData.opponent;
        const winnerColor = playerIndex === 0 ? '🔴' : '🔵';
        
        const embed = createSuccessEmbed(
            'Connect 4 - Game Over',
            `${winnerUser} (${winnerColor}) has won the game!`
        )
        .addFields(
            { name: 'Player 1 (🔴)', value: `${gameData.challenger}`, inline: true },
            { name: 'Player 2 (🔵)', value: `${gameData.opponent}`, inline: true },
            { name: 'Winner', value: `${winnerUser}`, inline: true }
        )
        .setDescription(getBoardDisplay(game.board));
        
        await interaction.update({ embeds: [embed], components: [] });
        
        // Clean up the game
        clearTimeout(gameData.timeout);
        interaction.client.games.delete(interaction.message.id);
        return;
    }
    
    // Check for draw
    if (game.turnCount === 42) { // 6x7 board = 42 cells
        game.gameOver = true;
        
        const embed = createInfoEmbed(
            'Connect 4 - Game Over',
            `The game ended in a draw!`
        )
        .addFields(
            { name: 'Player 1 (🔴)', value: `${gameData.challenger}`, inline: true },
            { name: 'Player 2 (🔵)', value: `${gameData.opponent}`, inline: true },
            { name: 'Result', value: 'Draw', inline: true }
        )
        .setDescription(getBoardDisplay(game.board));
        
        await interaction.update({ embeds: [embed], components: [] });
        
        // Clean up the game
        clearTimeout(gameData.timeout);
        interaction.client.games.delete(interaction.message.id);
        return;
    }
    
    // Switch turns
    game.currentTurn = game.players[1 - playerIndex];
    
    const nextPlayer = game.currentTurn === gameData.challenger.id ? gameData.challenger : gameData.opponent;
    const nextPlayerColor = game.currentTurn === gameData.challenger.id ? '🔴' : '🔵';
    
    const embed = createInfoEmbed(
        'Connect 4',
        `Game in progress! ${gameData.challenger} (🔴) vs ${gameData.opponent} (🔵)\n\nIt's ${nextPlayer}'s (${nextPlayerColor}) turn.`
    )
    .addFields(
        { name: 'Player 1 (🔴)', value: `${gameData.challenger}`, inline: true },
        { name: 'Player 2 (🔵)', value: `${gameData.opponent}`, inline: true },
        { name: 'Turn', value: `${nextPlayer}`, inline: true }
    )
    .setDescription(getBoardDisplay(game.board));
    
    const rows = createBoardButtons(game);
    
    await interaction.update({ embeds: [embed], components: rows });
}

function createBoardButtons(game) {
    const rows = [];
    
    // First row with columns 1-4
    const row1 = new ActionRowBuilder();
    for (let col = 0; col < 4; col++) {
        // Check if column is full
        const isColumnFull = game.board[0][col] !== null;
        
        const button = new ButtonBuilder()
            .setCustomId(`connect4_drop_${col}`)
            .setLabel(`${col + 1}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isColumnFull || game.gameOver);
        
        row1.addComponents(button);
    }
    rows.push(row1);
    
    // Second row with columns 5-7
    const row2 = new ActionRowBuilder();
    for (let col = 4; col < 7; col++) {
        // Check if column is full
        const isColumnFull = game.board[0][col] !== null;
        
        const button = new ButtonBuilder()
            .setCustomId(`connect4_drop_${col}`)
            .setLabel(`${col + 1}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isColumnFull || game.gameOver);
        
        row2.addComponents(button);
    }
    rows.push(row2);
    
    return rows;
}

function getBoardDisplay(board) {
    let display = '';
    
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
            const cell = board[row][col];
            
            if (cell === 0) {
                display += '🔴';
            } else if (cell === 1) {
                display += '🔵';
            } else {
                display += '⚪';
            }
        }
        display += '\n';
    }
    
    // Add column numbers at the bottom
    display += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
    
    return display;
}

function checkWin(board, row, col, player) {
    const directions = [
        [0, 1],  // horizontal
        [1, 0],  // vertical
        [1, 1],  // diagonal down-right
        [1, -1]  // diagonal down-left
    ];
    
    for (const [dx, dy] of directions) {
        let count = 1;  // Start with 1 for the piece just placed
        
        // Check in the positive direction
        for (let i = 1; i <= 3; i++) {
            const newRow = row + i * dx;
            const newCol = col + i * dy;
            
            if (newRow < 0 || newRow >= 6 || newCol < 0 || newCol >= 7) {
                break;  // Out of bounds
            }
            
            if (board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        
        // Check in the negative direction
        for (let i = 1; i <= 3; i++) {
            const newRow = row - i * dx;
            const newCol = col - i * dy;
            
            if (newRow < 0 || newRow >= 6 || newCol < 0 || newCol >= 7) {
                break;  // Out of bounds
            }
            
            if (board[newRow][newCol] === player) {
                count++;
            } else {
                break;
            }
        }
        
        if (count >= 4) {
            return true;
        }
    }
    
    return false;
}