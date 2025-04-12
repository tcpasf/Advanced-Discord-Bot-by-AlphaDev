const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createInfoEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

// Word categories and words
const wordCategories = {
    animals: ['elephant', 'giraffe', 'penguin', 'dolphin', 'kangaroo', 'tiger', 'leopard', 'rhinoceros', 'crocodile', 'octopus'],
    countries: ['australia', 'canada', 'japan', 'brazil', 'germany', 'france', 'mexico', 'egypt', 'thailand', 'sweden'],
    fruits: ['strawberry', 'pineapple', 'watermelon', 'blueberry', 'kiwi', 'mango', 'banana', 'orange', 'grape', 'coconut'],
    sports: ['basketball', 'football', 'tennis', 'swimming', 'volleyball', 'baseball', 'cricket', 'hockey', 'golf', 'rugby'],
    movies: ['avatar', 'titanic', 'inception', 'interstellar', 'gladiator', 'frozen', 'joker', 'matrix', 'avengers', 'jaws']
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hangman')
        .setDescription('Play a game of Hangman')
        .addStringOption(option => 
            option.setName('category')
                .setDescription('The category of words to play with')
                .setRequired(true)
                .addChoices(
                    { name: 'Animals', value: 'animals' },
                    { name: 'Countries', value: 'countries' },
                    { name: 'Fruits', value: 'fruits' },
                    { name: 'Sports', value: 'sports' },
                    { name: 'Movies', value: 'movies' }
                )),
    
    async execute(interaction) {
        const category = interaction.options.getString('category');
        
        if (!wordCategories[category]) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Invalid Category', 'Please select a valid category.')],
                ephemeral: true
            });
        }
        
        // Select a random word from the category
        const words = wordCategories[category];
        const word = words[Math.floor(Math.random() * words.length)];
        
        const game = {
            word: word,
            guessedLetters: [],
            incorrectGuesses: 0,
            maxIncorrectGuesses: 6,
            gameOver: false,
            won: false,
            category: category
        };
        
        const embed = createInfoEmbed(
            'Hangman',
            `${interaction.user} has started a game of Hangman!\n\nCategory: **${category.charAt(0).toUpperCase() + category.slice(1)}**\n\nGuess the word by clicking on the letter buttons below.`
        )
        .addFields(
            { name: 'Word', value: getWordDisplay(game), inline: true },
            { name: 'Guessed Letters', value: 'None', inline: true },
            { name: 'Incorrect Guesses', value: `${game.incorrectGuesses}/${game.maxIncorrectGuesses}`, inline: true }
        )
        .setImage(getHangmanImage(game.incorrectGuesses));
        
        const rows = createLetterButtons();
        
        const message = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
        
        // Store the game state in a collection on the client
        if (!interaction.client.games) {
            interaction.client.games = new Map();
        }
        
        interaction.client.games.set(message.id, {
            game,
            message,
            player: interaction.user,
            timeout: setTimeout(() => {
                if (interaction.client.games.has(message.id)) {
                    const gameData = interaction.client.games.get(message.id);
                    
                    if (!gameData.game.gameOver) {
                        const timeoutEmbed = createErrorEmbed(
                            'Game Expired',
                            `The Hangman game has expired due to inactivity.\n\nThe word was: **${gameData.game.word}**`
                        );
                        
                        message.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                        interaction.client.games.delete(message.id);
                    }
                }
            }, 300000) // 5 minute timeout
        });
    },
    
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('hangman_')) {
            return;
        }
        
        const letter = interaction.customId.split('_')[1];
        
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
                embeds: [createErrorEmbed('Not Your Game', 'This is not your game. Start your own game with /hangman.')],
                ephemeral: true
            });
        }
        
        // Check if the letter has already been guessed
        if (game.guessedLetters.includes(letter)) {
            return interaction.reply({ 
                embeds: [createErrorEmbed('Already Guessed', `You've already guessed the letter "${letter.toUpperCase()}"`)],
                ephemeral: true
            });
        }
        
        // Add the letter to guessed letters
        game.guessedLetters.push(letter);
        
        // Check if the letter is in the word
        if (!game.word.includes(letter)) {
            game.incorrectGuesses++;
        }
        
        // Check if the player has won
        const wordLetters = game.word.split('');
        const hasWon = wordLetters.every(letter => game.guessedLetters.includes(letter));
        
        if (hasWon) {
            game.gameOver = true;
            game.won = true;
            
            const embed = createSuccessEmbed(
                'Hangman - You Win!',
                `Congratulations, ${gameData.player}! You've guessed the word correctly!`
            )
            .addFields(
                { name: 'Word', value: `**${game.word.toUpperCase()}**`, inline: true },
                { name: 'Category', value: game.category.charAt(0).toUpperCase() + game.category.slice(1), inline: true },
                { name: 'Incorrect Guesses', value: `${game.incorrectGuesses}/${game.maxIncorrectGuesses}`, inline: true }
            )
            .setImage(getHangmanImage(game.incorrectGuesses));
            
            await interaction.update({ embeds: [embed], components: [] });
            
            // Clean up the game
            clearTimeout(gameData.timeout);
            interaction.client.games.delete(interaction.message.id);
            return;
        }
        
        // Check if the player has lost
        if (game.incorrectGuesses >= game.maxIncorrectGuesses) {
            game.gameOver = true;
            
            const embed = createErrorEmbed(
                'Hangman - Game Over',
                `Sorry, ${gameData.player}! You've run out of guesses.`
            )
            .addFields(
                { name: 'Word', value: `**${game.word.toUpperCase()}**`, inline: true },
                { name: 'Category', value: game.category.charAt(0).toUpperCase() + game.category.slice(1), inline: true },
                { name: 'Incorrect Guesses', value: `${game.incorrectGuesses}/${game.maxIncorrectGuesses}`, inline: true }
            )
            .setImage(getHangmanImage(game.incorrectGuesses));
            
            await interaction.update({ embeds: [embed], components: [] });
            
            // Clean up the game
            clearTimeout(gameData.timeout);
            interaction.client.games.delete(interaction.message.id);
            return;
        }
        
        // Update the game display
        const embed = createInfoEmbed(
            'Hangman',
            `${gameData.player} is playing Hangman!\n\nCategory: **${game.category.charAt(0).toUpperCase() + game.category.slice(1)}**\n\nGuess the word by clicking on the letter buttons below.`
        )
        .addFields(
            { name: 'Word', value: getWordDisplay(game), inline: true },
            { name: 'Guessed Letters', value: game.guessedLetters.length > 0 ? game.guessedLetters.map(l => l.toUpperCase()).join(', ') : 'None', inline: true },
            { name: 'Incorrect Guesses', value: `${game.incorrectGuesses}/${game.maxIncorrectGuesses}`, inline: true }
        )
        .setImage(getHangmanImage(game.incorrectGuesses));
        
        const rows = createLetterButtons(game.guessedLetters);
        
        await interaction.update({ embeds: [embed], components: rows });
    }
};

function getWordDisplay(game) {
    return game.word.split('').map(letter => 
        game.guessedLetters.includes(letter) ? letter.toUpperCase() : '\_'
    ).join(' ');
}

function createLetterButtons(guessedLetters = []) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
    const rows = [];
    
    // Create rows with 9 buttons each (3 rows total)
    for (let i = 0; i < alphabet.length; i += 9) {
        const row = new ActionRowBuilder();
        
        for (let j = i; j < Math.min(i + 9, alphabet.length); j++) {
            const letter = alphabet[j];
            
            const button = new ButtonBuilder()
                .setCustomId(`hangman_${letter}`)
                .setLabel(letter.toUpperCase())
                .setStyle(ButtonStyle.Secondary);
            
            if (guessedLetters.includes(letter)) {
                button.setDisabled(true);
            }
            
            row.addComponents(button);
        }
        
        rows.push(row);
    }
    
    return rows;
}

function getHangmanImage(incorrectGuesses) {
    const images = [
        'https://i.imgur.com/yk8iE0L.png', // 0 incorrect
        'https://i.imgur.com/RQJ8kN1.png', // 1 incorrect
        'https://i.imgur.com/ILpCQbV.png', // 2 incorrect
        'https://i.imgur.com/ZKuLdQD.png', // 3 incorrect
        'https://i.imgur.com/s8vZbgd.png', // 4 incorrect
        'https://i.imgur.com/lBKJhvx.png', // 5 incorrect
        'https://i.imgur.com/7Kubfh6.png'  // 6 incorrect (game over)
    ];
    
    return images[incorrectGuesses];
}