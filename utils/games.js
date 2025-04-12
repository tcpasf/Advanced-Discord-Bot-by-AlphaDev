const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class TicTacToe {
    constructor() {
        this.board = [
            [null, null, null],
            [null, null, null],
            [null, null, null]
        ];
        this.currentPlayer = 'X';
        this.gameOver = false;
        this.winner = null;
    }

    makeMove(row, col) {
        if (this.gameOver || this.board[row][col] !== null) {
            return false;
        }

        this.board[row][col] = this.currentPlayer;
        this.checkWinner();
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        return true;
    }

    checkWinner() {
        const lines = [
            // Rows
            [[0, 0], [0, 1], [0, 2]],
            [[1, 0], [1, 1], [1, 2]],
            [[2, 0], [2, 1], [2, 2]],
            // Columns
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]],
            [[0, 2], [1, 2], [2, 2]],
            // Diagonals
            [[0, 0], [1, 1], [2, 2]],
            [[0, 2], [1, 1], [2, 0]]
        ];

        for (const line of lines) {
            const [a, b, c] = line;
            if (
                this.board[a[0]][a[1]] &&
                this.board[a[0]][a[1]] === this.board[b[0]][b[1]] &&
                this.board[a[0]][a[1]] === this.board[c[0]][c[1]]
            ) {
                this.gameOver = true;
                this.winner = this.board[a[0]][a[1]];
                return;
            }
        }

        if (this.board.flat().every(cell => cell !== null)) {
            this.gameOver = true;
        }
    }

    getButtons() {
        const rows = [];
        
        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder();
            
            for (let j = 0; j < 3; j++) {
                const cell = this.board[i][j];
                const button = new ButtonBuilder()
                    .setCustomId(`ttt_${i}_${j}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this.gameOver || cell !== null);
                
                if (cell === 'X') {
                    button.setLabel('X').setStyle(ButtonStyle.Danger);
                } else if (cell === 'O') {
                    button.setLabel('O').setStyle(ButtonStyle.Success);
                } else {
                    button.setLabel(' ');
                }
                
                row.addComponents(button);
            }
            
            rows.push(row);
        }
        
        return rows;
    }

    getEmbed(player1, player2) {
        const embed = new EmbedBuilder()
            .setTitle('Tic Tac Toe')
            .setColor(0x3498db);
        
        if (this.gameOver) {
            if (this.winner) {
                const winnerUser = this.winner === 'X' ? player1 : player2;
                embed.setDescription(`Game Over! ${winnerUser} (${this.winner}) wins!`);
            } else {
                embed.setDescription('Game Over! It\'s a draw!');
            }
        } else {
            const currentUser = this.currentPlayer === 'X' ? player1 : player2;
            embed.setDescription(`Current turn: ${currentUser} (${this.currentPlayer})`);
        }
        
        return embed;
    }
}

class Hangman {
    constructor(word) {
        this.word = word.toLowerCase();
        this.guessedLetters = new Set();
        this.maxAttempts = 6;
        this.attempts = 0;
        this.gameOver = false;
        this.won = false;
    }

    guessLetter(letter) {
        letter = letter.toLowerCase();
        
        if (this.gameOver || this.guessedLetters.has(letter)) {
            return false;
        }
        
        this.guessedLetters.add(letter);
        
        if (!this.word.includes(letter)) {
            this.attempts++;
            
            if (this.attempts >= this.maxAttempts) {
                this.gameOver = true;
            }
        }
        
        if (this.word.split('').every(char => char === ' ' || this.guessedLetters.has(char))) {
            this.gameOver = true;
            this.won = true;
        }
        
        return true;
    }

    getDisplay() {
        return this.word
            .split('')
            .map(char => char === ' ' ? ' ' : this.guessedLetters.has(char) ? char : '_')
            .join(' ');
    }

    getHangman() {
        const stages = [
            '```\n  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========```',
            '```\n  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========```',
            '```\n  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========```',
            '```\n  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========```',
            '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========```',
            '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========```',
            '```\n  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n=========```'
        ];
        
        return stages[this.attempts];
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Hangman')
            .setColor(0x3498db)
            .setDescription(this.getHangman())
            .addFields(
                { name: 'Word', value: this.getDisplay() },
                { name: 'Guessed Letters', value: Array.from(this.guessedLetters).join(', ') || 'None' }
            );
        
        if (this.gameOver) {
            if (this.won) {
                embed.setColor(0x2ecc71).addFields({ name: 'Result', value: 'You won!' });
            } else {
                embed.setColor(0xe74c3c).addFields({ name: 'Result', value: `You lost! The word was: ${this.word}` });
            }
        }
        
        return embed;
    }

    getButtons() {
        const alphabet = 'abcdefghijklmnopqrstuvwxyz';
        const rows = [];
        
        for (let i = 0; i < 3; i++) {
            const row = new ActionRowBuilder();
            const start = i * 9;
            const end = Math.min(start + 9, alphabet.length);
            
            for (let j = start; j < end; j++) {
                const letter = alphabet[j];
                const button = new ButtonBuilder()
                    .setCustomId(`hangman_${letter}`)
                    .setLabel(letter.toUpperCase())
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(this.gameOver || this.guessedLetters.has(letter));
                
                row.addComponents(button);
            }
            
            rows.push(row);
        }
        
        return rows;
    }
}

class RockPaperScissors {
    constructor() {
        this.choices = ['rock', 'paper', 'scissors'];
        this.emojis = {
            rock: '🪨',
            paper: '📄',
            scissors: '✂️'
        };
    }

    getWinner(player1Choice, player2Choice) {
        if (player1Choice === player2Choice) {
            return 'tie';
        }
        
        if (
            (player1Choice === 'rock' && player2Choice === 'scissors') ||
            (player1Choice === 'paper' && player2Choice === 'rock') ||
            (player1Choice === 'scissors' && player2Choice === 'paper')
        ) {
            return 'player1';
        }
        
        return 'player2';
    }

    getButtons() {
        const row = new ActionRowBuilder();
        
        for (const choice of this.choices) {
            const button = new ButtonBuilder()
                .setCustomId(`rps_${choice}`)
                .setLabel(choice.charAt(0).toUpperCase() + choice.slice(1))
                .setStyle(ButtonStyle.Primary)
                .setEmoji(this.emojis[choice]);
            
            row.addComponents(button);
        }
        
        return [row];
    }

    getResultEmbed(player1, player1Choice, player2, player2Choice) {
        const result = this.getWinner(player1Choice, player2Choice);
        const embed = new EmbedBuilder()
            .setTitle('Rock Paper Scissors Result')
            .addFields(
                { name: player1, value: `${this.emojis[player1Choice]} ${player1Choice.charAt(0).toUpperCase() + player1Choice.slice(1)}` },
                { name: player2, value: `${this.emojis[player2Choice]} ${player2Choice.charAt(0).toUpperCase() + player2Choice.slice(1)}` }
            );
        
        if (result === 'tie') {
            embed.setDescription('It\'s a tie!').setColor(0xf1c40f);
        } else if (result === 'player1') {
            embed.setDescription(`${player1} wins!`).setColor(0x2ecc71);
        } else {
            embed.setDescription(`${player2} wins!`).setColor(0xe74c3c);
        }
        
        return embed;
    }
}

class NumberGuess {
    constructor(min = 1, max = 100) {
        this.min = min;
        this.max = max;
        this.number = Math.floor(Math.random() * (max - min + 1)) + min;
        this.attempts = 0;
        this.maxAttempts = 10;
        this.gameOver = false;
        this.won = false;
    }

    guess(number) {
        if (this.gameOver) {
            return null;
        }
        
        this.attempts++;
        
        if (number === this.number) {
            this.gameOver = true;
            this.won = true;
            return 'correct';
        }
        
        if (this.attempts >= this.maxAttempts) {
            this.gameOver = true;
            return 'out_of_attempts';
        }
        
        return number < this.number ? 'higher' : 'lower';
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Number Guessing Game')
            .setDescription(`Guess a number between ${this.min} and ${this.max}`)
            .setColor(0x3498db)
            .addFields({ name: 'Attempts', value: `${this.attempts}/${this.maxAttempts}` });
        
        if (this.gameOver) {
            if (this.won) {
                embed.setColor(0x2ecc71).setDescription(`You won! The number was ${this.number}`);
            } else {
                embed.setColor(0xe74c3c).setDescription(`You lost! The number was ${this.number}`);
            }
        }
        
        return embed;
    }
}

class Wordle {
    constructor(word) {
        this.word = word.toLowerCase();
        this.guesses = [];
        this.maxAttempts = 6;
        this.gameOver = false;
        this.won = false;
    }

    guess(word) {
        if (this.gameOver || this.guesses.length >= this.maxAttempts) {
            return false;
        }
        
        word = word.toLowerCase();
        
        if (word.length !== this.word.length) {
            return false;
        }
        
        this.guesses.push(word);
        
        if (word === this.word) {
            this.gameOver = true;
            this.won = true;
        } else if (this.guesses.length >= this.maxAttempts) {
            this.gameOver = true;
        }
        
        return true;
    }

    getGuessResult(guess) {
        const result = [];
        const wordLetters = this.word.split('');
        
        for (let i = 0; i < guess.length; i++) {
            if (guess[i] === this.word[i]) {
                result.push('🟩'); // Correct position
            } else if (wordLetters.includes(guess[i])) {
                result.push('🟨'); // Correct letter, wrong position
            } else {
                result.push('⬛'); // Wrong letter
            }
        }
        
        return result.join('');
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Wordle')
            .setColor(0x3498db);
        
        const guessDisplay = this.guesses.map(guess => {
            return `${guess.toUpperCase()} - ${this.getGuessResult(guess)}`;
        });
        
        embed.setDescription(guessDisplay.join('\n') || 'Make your first guess!');
        embed.addFields({ name: 'Attempts', value: `${this.guesses.length}/${this.maxAttempts}` });
        
        if (this.gameOver) {
            if (this.won) {
                embed.setColor(0x2ecc71).addFields({ name: 'Result', value: 'You won!' });
            } else {
                embed.setColor(0xe74c3c).addFields({ name: 'Result', value: `You lost! The word was: ${this.word.toUpperCase()}` });
            }
        }
        
        return embed;
    }
}

class Trivia {
    constructor(question, options, correctAnswer) {
        this.question = question;
        this.options = options;
        this.correctAnswer = correctAnswer;
        this.answered = false;
        this.selectedAnswer = null;
    }

    selectAnswer(answer) {
        if (this.answered) {
            return false;
        }
        
        this.answered = true;
        this.selectedAnswer = answer;
        return true;
    }

    isCorrect() {
        return this.selectedAnswer === this.correctAnswer;
    }

    getButtons() {
        const rows = [];
        const row = new ActionRowBuilder();
        
        for (let i = 0; i < this.options.length; i++) {
            const button = new ButtonBuilder()
                .setCustomId(`trivia_${i}`)
                .setLabel(this.options[i])
                .setStyle(ButtonStyle.Primary)
                .setDisabled(this.answered);
            
            if (this.answered) {
                if (i === this.correctAnswer) {
                    button.setStyle(ButtonStyle.Success);
                } else if (i === this.selectedAnswer) {
                    button.setStyle(ButtonStyle.Danger);
                }
            }
            
            row.addComponents(button);
            
            if (row.components.length === 5 || i === this.options.length - 1) {
                rows.push(row);
                if (i < this.options.length - 1) {
                    row = new ActionRowBuilder();
                }
            }
        }
        
        return rows;
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Trivia Question')
            .setDescription(this.question)
            .setColor(0x3498db);
        
        if (this.answered) {
            if (this.isCorrect()) {
                embed.setColor(0x2ecc71).addFields({ name: 'Result', value: 'Correct!' });
            } else {
                embed.setColor(0xe74c3c).addFields({ 
                    name: 'Result', 
                    value: `Incorrect! The correct answer is: ${this.options[this.correctAnswer]}` 
                });
            }
        }
        
        return embed;
    }
}

class Connect4 {
    constructor() {
        this.board = Array(6).fill().map(() => Array(7).fill(null));
        this.currentPlayer = 1; // 1 or 2
        this.gameOver = false;
        this.winner = null;
    }

    makeMove(column) {
        if (this.gameOver || column < 0 || column >= 7) {
            return false;
        }
        
        // Find the lowest empty row in the column
        let row = -1;
        for (let r = 5; r >= 0; r--) {
            if (this.board[r][column] === null) {
                row = r;
                break;
            }
        }
        
        if (row === -1) {
            return false; // Column is full
        }
        
        this.board[row][column] = this.currentPlayer;
        this.checkWinner(row, column);
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        
        return true;
    }

    checkWinner(row, column) {
        const directions = [
            [0, 1],  // Horizontal
            [1, 0],  // Vertical
            [1, 1],  // Diagonal down-right
            [1, -1]  // Diagonal down-left
        ];
        
        const player = this.board[row][column];
        
        for (const [dr, dc] of directions) {
            let count = 1;
            
            // Check in positive direction
            for (let i = 1; i <= 3; i++) {
                const r = row + dr * i;
                const c = column + dc * i;
                
                if (r < 0 || r >= 6 || c < 0 || c >= 7 || this.board[r][c] !== player) {
                    break;
                }
                
                count++;
            }
            
            // Check in negative direction
            for (let i = 1; i <= 3; i++) {
                const r = row - dr * i;
                const c = column - dc * i;
                
                if (r < 0 || r >= 6 || c < 0 || c >= 7 || this.board[r][c] !== player) {
                    break;
                }
                
                count++;
            }
            
            if (count >= 4) {
                this.gameOver = true;
                this.winner = player;
                return;
            }
        }
        
        // Check for draw
        if (this.board[0].every(cell => cell !== null)) {
            this.gameOver = true;
        }
    }

    getButtons() {
        const row = new ActionRowBuilder();
        
        for (let col = 0; col < 7; col++) {
            const button = new ButtonBuilder()
                .setCustomId(`connect4_${col}`)
                .setLabel(`${col + 1}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(this.gameOver || this.board[0][col] !== null);
            
            row.addComponents(button);
        }
        
        return [row];
    }

    getEmbed(player1, player2) {
        const embed = new EmbedBuilder()
            .setTitle('Connect 4')
            .setColor(0x3498db);
        
        const boardDisplay = this.board.map(row => {
            return row.map(cell => {
                if (cell === null) return '⚪';
                if (cell === 1) return '🔴';
                if (cell === 2) return '🟡';
            }).join('');
        }).join('\n');
        
        embed.setDescription(`${boardDisplay}\n1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣`);
        
        if (this.gameOver) {
            if (this.winner) {
                const winnerUser = this.winner === 1 ? player1 : player2;
                embed.addFields({ name: 'Result', value: `${winnerUser} wins!` });
            } else {
                embed.addFields({ name: 'Result', value: 'It\'s a draw!' });
            }
        } else {
            const currentUser = this.currentPlayer === 1 ? player1 : player2;
            embed.addFields({ name: 'Current Turn', value: currentUser });
        }
        
        return embed;
    }
}

class Blackjack {
    constructor() {
        this.deck = this.createDeck();
        this.playerHand = [];
        this.dealerHand = [];
        this.gameOver = false;
        this.playerStand = false;
        
        // Initial deal
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());
        this.playerHand.push(this.drawCard());
        this.dealerHand.push(this.drawCard());
    }

    createDeck() {
        const suits = ['♠️', '♥️', '♦️', '♣️'];
        const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        const deck = [];
        
        for (const suit of suits) {
            for (const value of values) {
                deck.push({ suit, value });
            }
        }
        
        return this.shuffle(deck);
    }

    shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }

    drawCard() {
        return this.deck.pop();
    }

    getCardValue(card) {
        if (['J', 'Q', 'K'].includes(card.value)) {
            return 10;
        } else if (card.value === 'A') {
            return 11;
        } else {
            return parseInt(card.value);
        }
    }

    getHandValue(hand) {
        let value = 0;
        let aces = 0;
        
        for (const card of hand) {
            value += this.getCardValue(card);
            if (card.value === 'A') {
                aces++;
            }
        }
        
        while (value > 21 && aces > 0) {
            value -= 10;
            aces--;
        }
        
        return value;
    }

    hit() {
        if (this.gameOver || this.playerStand) {
            return false;
        }
        
        this.playerHand.push(this.drawCard());
        
        if (this.getHandValue(this.playerHand) > 21) {
            this.gameOver = true;
        }
        
        return true;
    }

    stand() {
        if (this.gameOver || this.playerStand) {
            return false;
        }
        
        this.playerStand = true;
        
        while (this.getHandValue(this.dealerHand) < 17) {
            this.dealerHand.push(this.drawCard());
        }
        
        this.gameOver = true;
        return true;
    }

    getResult() {
        const playerValue = this.getHandValue(this.playerHand);
        const dealerValue = this.getHandValue(this.dealerHand);
        
        if (playerValue > 21) {
            return 'Player busts! Dealer wins.';
        } else if (dealerValue > 21) {
            return 'Dealer busts! Player wins.';
        } else if (playerValue > dealerValue) {
            return 'Player wins!';
        } else if (dealerValue > playerValue) {
            return 'Dealer wins!';
        } else {
            return 'It\'s a tie!';
        }
    }

    getButtons() {
        const row = new ActionRowBuilder();
        
        const hitButton = new ButtonBuilder()
            .setCustomId('blackjack_hit')
            .setLabel('Hit')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(this.gameOver || this.playerStand);
        
        const standButton = new ButtonBuilder()
            .setCustomId('blackjack_stand')
            .setLabel('Stand')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(this.gameOver || this.playerStand);
        
        row.addComponents(hitButton, standButton);
        
        return [row];
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Blackjack')
            .setColor(0x3498db);
        
        const playerCards = this.playerHand.map(card => `${card.value}${card.suit}`).join(' ');
        const playerValue = this.getHandValue(this.playerHand);
        
        embed.addFields({ name: 'Your Hand', value: `${playerCards} (${playerValue})` });
        
        if (this.gameOver || this.playerStand) {
            const dealerCards = this.dealerHand.map(card => `${card.value}${card.suit}`).join(' ');
            const dealerValue = this.getHandValue(this.dealerHand);
            embed.addFields({ name: 'Dealer Hand', value: `${dealerCards} (${dealerValue})` });
        } else {
            const dealerFirstCard = this.dealerHand[0];
            embed.addFields({ name: 'Dealer Hand', value: `${dealerFirstCard.value}${dealerFirstCard.suit} ?` });
        }
        
        if (this.gameOver) {
            embed.addFields({ name: 'Result', value: this.getResult() });
            
            if (this.getResult().includes('Player wins')) {
                embed.setColor(0x2ecc71);
            } else if (this.getResult().includes('Dealer wins')) {
                embed.setColor(0xe74c3c);
            } else {
                embed.setColor(0xf1c40f);
            }
        }
        
        return embed;
    }
}

class Minesweeper {
    constructor(rows = 5, cols = 5, mines = 5) {
        this.rows = rows;
        this.cols = cols;
        this.mines = mines;
        this.board = Array(rows).fill().map(() => Array(cols).fill({ mine: false, revealed: false, flagged: false, count: 0 }));
        this.gameOver = false;
        this.won = false;
        this.firstMove = true;
        
        this.initializeBoard();
    }

    initializeBoard() {
        this.board = Array(this.rows).fill().map(() => 
            Array(this.cols).fill().map(() => ({ 
                mine: false, 
                revealed: false, 
                flagged: false, 
                count: 0 
            }))
        );
    }

    placeMines(firstRow, firstCol) {
        let minesPlaced = 0;
        
        while (minesPlaced < this.mines) {
            const row = Math.floor(Math.random() * this.rows);
            const col = Math.floor(Math.random() * this.cols);
            
            // Don't place a mine at the first click or adjacent to it
            if ((Math.abs(row - firstRow) <= 1 && Math.abs(col - firstCol) <= 1) || this.board[row][col].mine) {
                continue;
            }
            
            this.board[row][col].mine = true;
            minesPlaced++;
        }
        
        // Calculate numbers
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (!this.board[r][c].mine) {
                    let count = 0;
                    
                    for (let dr = -1; dr <= 1; dr++) {
                        for (let dc = -1; dc <= 1; dc++) {
                            const nr = r + dr;
                            const nc = c + dc;
                            
                            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc].mine) {
                                count++;
                            }
                        }
                    }
                    
                    this.board[r][c].count = count;
                }
            }
        }
    }

    reveal(row, col) {
        if (this.gameOver || row < 0 || row >= this.rows || col < 0 || col >= this.cols || this.board[row][col].revealed || this.board[row][col].flagged) {
            return false;
        }
        
        if (this.firstMove) {
            this.firstMove = false;
            this.placeMines(row, col);
        }
        
        this.board[row][col].revealed = true;
        
        if (this.board[row][col].mine) {
            this.gameOver = true;
            return true;
        }
        
        if (this.board[row][col].count === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    this.reveal(row + dr, col + dc);
                }
            }
        }
        
        this.checkWin();
        return true;
    }

    flag(row, col) {
        if (this.gameOver || row < 0 || row >= this.rows || col < 0 || col >= this.cols || this.board[row][col].revealed) {
            return false;
        }
        
        this.board[row][col].flagged = !this.board[row][col].flagged;
        this.checkWin();
        return true;
    }

    checkWin() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                
                if (!cell.mine && !cell.revealed) {
                    return false;
                }
            }
        }
        
        this.gameOver = true;
        this.won = true;
        return true;
    }

    getButtons() {
        const rows = [];
        
        for (let r = 0; r < this.rows; r++) {
            const row = new ActionRowBuilder();
            
            for (let c = 0; c < this.cols; c++) {
                const cell = this.board[r][c];
                const button = new ButtonBuilder()
                    .setCustomId(`ms_${r}_${c}`)
                    .setStyle(ButtonStyle.Secondary);
                
                if (cell.revealed) {
                    if (cell.mine) {
                        button.setLabel('💣').setStyle(ButtonStyle.Danger);
                    } else if (cell.count === 0) {
                        button.setLabel(' ').setStyle(ButtonStyle.Secondary);
                    } else {
                        button.setLabel(cell.count.toString()).setStyle(ButtonStyle.Primary);
                    }
                } else if (cell.flagged) {
                    button.setLabel('🚩').setStyle(ButtonStyle.Success);
                } else {
                    button.setLabel('?');
                }
                
                button.setDisabled(this.gameOver || cell.revealed);
                row.addComponents(button);
            }
            
            rows.push(row);
        }
        
        return rows;
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Minesweeper')
            .setDescription(`Mines: ${this.mines}`)
            .setColor(0x3498db);
        
        if (this.gameOver) {
            if (this.won) {
                embed.setColor(0x2ecc71).addFields({ name: 'Result', value: 'You won!' });
            } else {
                embed.setColor(0xe74c3c).addFields({ name: 'Result', value: 'You hit a mine! Game over.' });
            }
        }
        
        return embed;
    }
}

class Coinflip {
    constructor() {
        this.result = Math.random() < 0.5 ? 'heads' : 'tails';
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setTitle('Coinflip')
            .setDescription(`The coin landed on: ${this.result.toUpperCase()}`)
            .setColor(0x3498db)
            .setImage(this.result === 'heads' ? 'https://i.imgur.com/HAvGDNJ.png' : 'https://i.imgur.com/STmq0LE.png');
        
        return embed;
    }
}

class Dice {
    constructor(sides = 6) {
        this.sides = sides;
        this.result = Math.floor(Math.random() * sides) + 1;
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setTitle(`Dice Roll (d${this.sides})`)
            .setDescription(`You rolled: ${this.result}`)
            .setColor(0x3498db);
        
        return embed;
    }
}

module.exports = {
    TicTacToe,
    Hangman,
    RockPaperScissors,
    NumberGuess,
    Wordle,
    Trivia,
    Connect4,
    Blackjack,
    Minesweeper,
    Coinflip,
    Dice
};