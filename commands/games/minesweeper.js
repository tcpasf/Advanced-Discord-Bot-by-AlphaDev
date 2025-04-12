const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createInfoEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minesweeper')
        .setDescription('Play a game of Minesweeper')
        .addIntegerOption(option => 
            option.setName('difficulty')
                .setDescription('The difficulty level')
                .setRequired(false)
                .addChoices(
                    { name: 'Easy (5x5, 5 mines)', value: 0 },
                    { name: 'Medium (8x8, 10 mines)', value: 1 },
                    { name: 'Hard (8x8, 15 mines)', value: 2 }
                )),
    
    async execute(interaction) {
        const difficulty = interaction.options.getInteger('difficulty') || 0;
        
        let size, mines;
        
        switch (difficulty) {
            case 0: // Easy
                size = 5;
                mines = 5;
                break;
            case 1: // Medium
                size = 8;
                mines = 10;
                break;
            case 2: // Hard
                size = 8;
                mines = 15;
                break;
            default:
                size = 5;
                mines = 5;
        }
        
        // Create the game board
        const board = createBoard(size, mines);
        
        const game = {
            board,
            revealed: Array(size).fill().map(() => Array(size).fill(false)),
            flagged: Array(size).fill().map(() => Array(size).fill(false)),
            gameOver: false,
            won: false,
            size,
            mines,
            minesLeft: mines,
            cellsRevealed: 0
        };
        
        const embed = createInfoEmbed(
            'Minesweeper',
            `${interaction.user} is playing Minesweeper!\n\nDifficulty: ${getDifficultyName(difficulty)}\nMines: ${mines}\nSize: ${size}x${size}\n\nClick on a cell to reveal it. Right-click (or use the flag button) to flag a mine.`
        )
        .addFields(
            { name: 'Mines Left', value: `${game.minesLeft}`, inline: true },
            { name: 'Cells Revealed', value: `${game.cellsRevealed}/${size*size - mines}`, inline: true }
        );
        
        const rows = createBoardButtons(game);
        
        const message = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
        
        // Store the game state in a collection on the client
        if (!interaction.client.games) {
            interaction.client.games = new Map();
        }
        
        interaction.client.games.set(message.id, {
            game,
            message,
            player: interaction.user,
            flagMode: false,
            timeout: setTimeout(() => {
                if (interaction.client.games.has(message.id)) {
                    const gameData = interaction.client.games.get(message.id);
                    
                    if (!gameData.game.gameOver) {
                        const timeoutEmbed = createErrorEmbed(
                            'Game Expired',
                            'The Minesweeper game has expired due to inactivity.'
                        );
                        
                        message.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                        interaction.client.games.delete(message.id);
                    }
                }
            }, 300000) // 5 minute timeout
        });
    },
    
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('ms_')) {
            return;
        }
        
        const parts = interaction.customId.split('_');
        const action = parts[1];
        
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
        
        // Only the player who started the game can play
        if (interaction.user.id !== gameData.player.id) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Not Your Game', 'This is not your game. Start your own game with /minesweeper.')],
                ephemeral: true
            });
        }
        
        if (action === 'flag') {
            // Toggle flag mode
            gameData.flagMode = !gameData.flagMode;
            
            const embed = createInfoEmbed(
                'Minesweeper',
                `${gameData.player} is playing Minesweeper!\n\nDifficulty: ${getDifficultyName(getDifficultyFromSize(game.size, game.mines))}\nMines: ${game.mines}\nSize: ${game.size}x${game.size}\n\nFlag Mode: ${gameData.flagMode ? 'ON' : 'OFF'}`
            )
            .addFields(
                { name: 'Mines Left', value: `${game.minesLeft}`, inline: true },
                { name: 'Cells Revealed', value: `${game.cellsRevealed}/${game.size*game.size - game.mines}`, inline: true }
            );
            
            const rows = createBoardButtons(game, gameData.flagMode);
            
            await interaction.update({ embeds: [embed], components: rows });
        } else if (action === 'cell') {
            const row = parseInt(parts[2]);
            const col = parseInt(parts[3]);
            
            if (gameData.flagMode) {
                // Flag/unflag the cell
                if (!game.revealed[row][col]) {
                    game.flagged[row][col] = !game.flagged[row][col];
                    
                    if (game.flagged[row][col]) {
                        game.minesLeft--;
                    } else {
                        game.minesLeft++;
                    }
                    
                    // Check if all mines are correctly flagged
                    let allMinesFlagged = true;
                    let noWrongFlags = true;
                    
                    for (let r = 0; r < game.size; r++) {
                        for (let c = 0; c < game.size; c++) {
                            if (game.board[r][c] === -1 && !game.flagged[r][c]) {
                                allMinesFlagged = false;
                            }
                            if (game.flagged[r][c] && game.board[r][c] !== -1) {
                                noWrongFlags = false;
                            }
                        }
                    }
                    
                    if (allMinesFlagged && noWrongFlags) {
                        game.gameOver = true;
                        game.won = true;
                        
                        // Reveal all cells
                        for (let r = 0; r < game.size; r++) {
                            for (let c = 0; c < game.size; c++) {
                                game.revealed[r][c] = true;
                            }
                        }
                        
                        const embed = createSuccessEmbed(
                            'Minesweeper - You Win!',
                            `Congratulations, ${gameData.player}! You've successfully flagged all mines!`
                        )
                        .addFields(
                            { name: 'Difficulty', value: getDifficultyName(getDifficultyFromSize(game.size, game.mines)), inline: true },
                            { name: 'Mines', value: `${game.mines}`, inline: true },
                            { name: 'Size', value: `${game.size}x${game.size}`, inline: true }
                        );
                        
                        const rows = createBoardButtons(game, false, true);
                        
                        await interaction.update({ embeds: [embed], components: rows });
                        
                        // Clean up the game
                        clearTimeout(gameData.timeout);
                        interaction.client.games.delete(interaction.message.id);
                        return;
                    }
                }
            } else {
                // Reveal the cell
                if (game.flagged[row][col]) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Cell Flagged', 'This cell is flagged. Unflag it first to reveal it.')],
                        ephemeral: true
                    });
                }
                
                if (game.revealed[row][col]) {
                    return interaction.reply({ 
                        embeds: [createErrorEmbed('Already Revealed', 'This cell is already revealed.')],
                        ephemeral: true
                    });
                }
                
                // Check if it's a mine
                if (game.board[row][col] === -1) {
                    game.gameOver = true;
                    game.revealed[row][col] = true;
                    
                    // Reveal all mines
                    for (let r = 0; r < game.size; r++) {
                        for (let c = 0; c < game.size; c++) {
                            if (game.board[r][c] === -1) {
                                game.revealed[r][c] = true;
                            }
                        }
                    }
                    
                    const embed = createErrorEmbed(
                        'Minesweeper - Game Over',
                        `${gameData.player}, you hit a mine! Game over.`
                    )
                    .addFields(
                        { name: 'Difficulty', value: getDifficultyName(getDifficultyFromSize(game.size, game.mines)), inline: true },
                        { name: 'Mines', value: `${game.mines}`, inline: true },
                        { name: 'Size', value: `${game.size}x${game.size}`, inline: true }
                    );
                    
                    const rows = createBoardButtons(game, false, true);
                    
                    await interaction.update({ embeds: [embed], components: rows });
                    
                    // Clean up the game
                    clearTimeout(gameData.timeout);
                    interaction.client.games.delete(interaction.message.id);
                    return;
                }
                
                // Reveal the cell and adjacent cells if it's a 0
                revealCell(game, row, col);
                
                // Check if all non-mine cells are revealed
                if (game.cellsRevealed === game.size * game.size - game.mines) {
                    game.gameOver = true;
                    game.won = true;
                    
                    // Flag all mines
                    for (let r = 0; r < game.size; r++) {
                        for (let c = 0; c < game.size; c++) {
                            if (game.board[r][c] === -1) {
                                game.flagged[r][c] = true;
                            }
                        }
                    }
                    
                    const embed = createSuccessEmbed(
                        'Minesweeper - You Win!',
                        `Congratulations, ${gameData.player}! You've successfully revealed all safe cells!`
                    )
                    .addFields(
                        { name: 'Difficulty', value: getDifficultyName(getDifficultyFromSize(game.size, game.mines)), inline: true },
                        { name: 'Mines', value: `${game.mines}`, inline: true },
                        { name: 'Size', value: `${game.size}x${game.size}`, inline: true }
                    );
                    
                    const rows = createBoardButtons(game, false, true);
                    
                    await interaction.update({ embeds: [embed], components: rows });
                    
                    // Clean up the game
                    clearTimeout(gameData.timeout);
                    interaction.client.games.delete(interaction.message.id);
                    return;
                }
            }
            
            // Update the game display
            const embed = createInfoEmbed(
                'Minesweeper',
                `${gameData.player} is playing Minesweeper!\n\nDifficulty: ${getDifficultyName(getDifficultyFromSize(game.size, game.mines))}\nMines: ${game.mines}\nSize: ${game.size}x${game.size}\n\nFlag Mode: ${gameData.flagMode ? 'ON' : 'OFF'}`
            )
            .addFields(
                { name: 'Mines Left', value: `${game.minesLeft}`, inline: true },
                { name: 'Cells Revealed', value: `${game.cellsRevealed}/${game.size*game.size - game.mines}`, inline: true }
            );
            
            const rows = createBoardButtons(game, gameData.flagMode);
            
            await interaction.update({ embeds: [embed], components: rows });
        }
    }
};

function createBoard(size, mines) {
    // Create an empty board
    const board = Array(size).fill().map(() => Array(size).fill(0));
    
    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < mines) {
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        
        if (board[row][col] !== -1) {
            board[row][col] = -1;
            minesPlaced++;
            
            // Update adjacent cell counts
            for (let r = Math.max(0, row - 1); r <= Math.min(size - 1, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(size - 1, col + 1); c++) {
                    if (board[r][c] !== -1) {
                        board[r][c]++;
                    }
                }
            }
        }
    }
    
    return board;
}

function createBoardButtons(game, flagMode = false, gameOver = false) {
    const rows = [];
    const maxRowsPerMessage = 5; // Discord limits to 5 action rows
    
    // Add flag toggle button
    const flagRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ms_flag')
                .setLabel(flagMode ? 'Flag Mode: ON' : 'Flag Mode: OFF')
                .setStyle(flagMode ? ButtonStyle.Success : ButtonStyle.Secondary)
                .setEmoji('🚩')
                .setDisabled(gameOver)
        );
    
    rows.push(flagRow);
    
    // For larger boards, we need to be selective about which buttons to show
    // since Discord only allows 5 action rows and 5 buttons per row
    const maxButtonsPerRow = 5;
    const maxRows = 4; // Save one row for the flag toggle
    
    // For boards larger than 5x5, we'll need to be creative
    // For now, we'll just show a subset of the board for larger sizes
    const displaySize = Math.min(game.size, maxButtonsPerRow);
    
    for (let row = 0; row < displaySize; row++) {
        if (rows.length >= maxRowsPerMessage) break;
        
        const actionRow = new ActionRowBuilder();
        
        for (let col = 0; col < displaySize; col++) {
            const cell = game.board[row][col];
            const revealed = game.revealed[row][col];
            const flagged = game.flagged[row][col];
            
            let label = '\u2800'; // Using Unicode Braille Pattern Blank (invisible but valid)
            let style = ButtonStyle.Secondary;
            let emoji = null;
            let disabled = gameOver;
            
            if (revealed) {
                if (cell === -1) {
                    label = '\u2800';
                    emoji = '💣';
                    style = ButtonStyle.Danger;
                } else if (cell === 0) {
                    label = '\u2800';
                    style = ButtonStyle.Primary;
                } else {
                    label = cell.toString();
                    style = ButtonStyle.Primary;
                }
                disabled = true;
            } else if (flagged) {
                label = '\u2800';
                emoji = '🚩';
                style = ButtonStyle.Success;
            }
            
            actionRow.addComponents(
                new ButtonBuilder()
                    .setCustomId(`ms_cell_${row}_${col}`)
                    .setLabel(label)
                    .setStyle(style)
                    .setDisabled(disabled)
            );
            
            if (emoji) {
                actionRow.components[actionRow.components.length - 1].setEmoji(emoji);
            }
        }
        
        rows.push(actionRow);
    }
    
    return rows;
}

function revealCell(game, row, col) {
    if (row < 0 || row >= game.size || col < 0 || col >= game.size || game.revealed[row][col] || game.flagged[row][col]) {
        return;
    }
    
    game.revealed[row][col] = true;
    game.cellsRevealed++;
    
    // If it's a 0, reveal adjacent cells
    if (game.board[row][col] === 0) {
        for (let r = Math.max(0, row - 1); r <= Math.min(game.size - 1, row + 1); r++) {
            for (let c = Math.max(0, col - 1); c <= Math.min(game.size - 1, col + 1); c++) {
                revealCell(game, r, c);
            }
        }
    }
}

function getDifficultyName(difficulty) {
    switch (difficulty) {
        case 0: return 'Easy';
        case 1: return 'Medium';
        case 2: return 'Hard';
        default: return 'Custom';
    }
}

function getDifficultyFromSize(size, mines) {
    if (size === 5 && mines === 5) return 0;
    if (size === 8 && mines === 10) return 1;
    if (size === 8 && mines === 15) return 2;
    return -1;
}