const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createInfoEmbed, createErrorEmbed, createSuccessEmbed } = require('../../utils/embeds');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of Blackjack against the dealer'),
    
    async execute(interaction) {
        // Create a new deck and shuffle it
        const deck = createDeck();
        shuffleDeck(deck);
        
        // Deal initial cards
        const playerHand = [drawCard(deck), drawCard(deck)];
        const dealerHand = [drawCard(deck), drawCard(deck)];
        
        const game = {
            deck,
            playerHand,
            dealerHand,
            gameOver: false,
            playerStand: false,
            result: null
        };
        
        // Check for natural blackjack
        const playerValue = calculateHandValue(playerHand);
        const dealerValue = calculateHandValue(dealerHand);
        
        if (playerValue === 21 && dealerValue === 21) {
            game.gameOver = true;
            game.result = 'push';
        } else if (playerValue === 21) {
            game.gameOver = true;
            game.result = 'blackjack';
        } else if (dealerValue === 21) {
            game.gameOver = true;
            game.result = 'dealer';
        }
        
        const embed = createInfoEmbed(
            'Blackjack',
            `${interaction.user} is playing Blackjack!`
        )
        .addFields(
            { name: 'Your Hand', value: formatHand(playerHand, false), inline: true },
            { name: 'Your Value', value: `${calculateHandValue(playerHand)}`, inline: true },
            { name: 'Dealer Hand', value: formatHand([dealerHand[0], { rank: '?', suit: '?' }], false), inline: true },
            { name: 'Dealer Value', value: `${calculateCardValue(dealerHand[0])}`, inline: true }
        );
        
        let components = [];
        
        if (!game.gameOver) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('blackjack_hit')
                        .setLabel('Hit')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('blackjack_stand')
                        .setLabel('Stand')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('blackjack_double')
                        .setLabel('Double Down')
                        .setStyle(ButtonStyle.Success)
                );
            
            components = [row];
        } else {
            // Show result for natural blackjack
            embed.addFields({ name: 'Result', value: getResultText(game.result) });
            embed.setFields([
                { name: 'Your Hand', value: formatHand(playerHand, false), inline: true },
                { name: 'Your Value', value: `${calculateHandValue(playerHand)}`, inline: true },
                { name: 'Dealer Hand', value: formatHand(dealerHand, false), inline: true },
                { name: 'Dealer Value', value: `${calculateHandValue(dealerHand)}`, inline: true },
                { name: 'Result', value: getResultText(game.result) }
            ]);
        }
        
        const message = await interaction.reply({ embeds: [embed], components, fetchReply: true });
        
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
                            'The Blackjack game has expired due to inactivity.'
                        );
                        
                        message.edit({ embeds: [timeoutEmbed], components: [] }).catch(console.error);
                        interaction.client.games.delete(message.id);
                    }
                }
            }, 180000) // 3 minute timeout
        });
    },
    
    async handleButton(interaction) {
        if (!interaction.customId.startsWith('blackjack_')) {
            return;
        }
        
        const action = interaction.customId.split('_')[1];
        
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
                embeds: [createErrorEmbed('Not Your Game', 'This is not your game. Start your own game with /blackjack.')],
                ephemeral: true
            });
        }
        
        if (action === 'hit') {
            // Draw a card for the player
            game.playerHand.push(drawCard(game.deck));
            
            // Check if player busts
            const playerValue = calculateHandValue(game.playerHand);
            
            if (playerValue > 21) {
                game.gameOver = true;
                game.result = 'bust';
                
                const embed = createErrorEmbed(
                    'Blackjack - Bust!',
                    `${gameData.player}, you busted with a hand value of ${playerValue}!`
                )
                .addFields(
                    { name: 'Your Hand', value: formatHand(game.playerHand, false), inline: true },
                    { name: 'Your Value', value: `${playerValue}`, inline: true },
                    { name: 'Dealer Hand', value: formatHand(game.dealerHand, false), inline: true },
                    { name: 'Dealer Value', value: `${calculateHandValue(game.dealerHand)}`, inline: true },
                    { name: 'Result', value: getResultText(game.result) }
                );
                
                await interaction.update({ embeds: [embed], components: [] });
                
                // Clean up the game
                clearTimeout(gameData.timeout);
                interaction.client.games.delete(interaction.message.id);
                return;
            }
            
            // Continue the game
            const embed = createInfoEmbed(
                'Blackjack',
                `${gameData.player} is playing Blackjack!`
            )
            .addFields(
                { name: 'Your Hand', value: formatHand(game.playerHand, false), inline: true },
                { name: 'Your Value', value: `${playerValue}`, inline: true },
                { name: 'Dealer Hand', value: formatHand([game.dealerHand[0], { rank: '?', suit: '?' }], false), inline: true },
                { name: 'Dealer Value', value: `${calculateCardValue(game.dealerHand[0])}`, inline: true }
            );
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('blackjack_hit')
                        .setLabel('Hit')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('blackjack_stand')
                        .setLabel('Stand')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            await interaction.update({ embeds: [embed], components: [row] });
        } else if (action === 'stand') {
            game.playerStand = true;
            
            // Dealer plays
            let dealerValue = calculateHandValue(game.dealerHand);
            
            // Dealer must hit on 16 or less and stand on 17 or more
            while (dealerValue < 17) {
                game.dealerHand.push(drawCard(game.deck));
                dealerValue = calculateHandValue(game.dealerHand);
            }
            
            // Determine the winner
            const playerValue = calculateHandValue(game.playerHand);
            
            game.gameOver = true;
            
            if (dealerValue > 21) {
                game.result = 'dealer_bust';
            } else if (playerValue > dealerValue) {
                game.result = 'player';
            } else if (dealerValue > playerValue) {
                game.result = 'dealer';
            } else {
                game.result = 'push';
            }
            
            const embed = createInfoEmbed(
                'Blackjack - Game Over',
                `${gameData.player}, the game has ended!`
            )
            .addFields(
                { name: 'Your Hand', value: formatHand(game.playerHand, false), inline: true },
                { name: 'Your Value', value: `${playerValue}`, inline: true },
                { name: 'Dealer Hand', value: formatHand(game.dealerHand, false), inline: true },
                { name: 'Dealer Value', value: `${dealerValue}`, inline: true },
                { name: 'Result', value: getResultText(game.result) }
            );
            
            if (game.result === 'player' || game.result === 'dealer_bust') {
                embed.setColor('#00FF00');
            } else if (game.result === 'dealer') {
                embed.setColor('#FF0000');
            }
            
            await interaction.update({ embeds: [embed], components: [] });
            
            // Clean up the game
            clearTimeout(gameData.timeout);
            interaction.client.games.delete(interaction.message.id);
        } else if (action === 'double') {
            // Double down: double the bet, take exactly one more card, then stand
            game.playerHand.push(drawCard(game.deck));
            game.playerStand = true;
            
            const playerValue = calculateHandValue(game.playerHand);
            
            // Check if player busts
            if (playerValue > 21) {
                game.gameOver = true;
                game.result = 'bust';
                
                const embed = createErrorEmbed(
                    'Blackjack - Bust!',
                    `${gameData.player}, you busted with a hand value of ${playerValue}!`
                )
                .addFields(
                    { name: 'Your Hand', value: formatHand(game.playerHand, false), inline: true },
                    { name: 'Your Value', value: `${playerValue}`, inline: true },
                    { name: 'Dealer Hand', value: formatHand(game.dealerHand, false), inline: true },
                    { name: 'Dealer Value', value: `${calculateHandValue(game.dealerHand)}`, inline: true },
                    { name: 'Result', value: getResultText(game.result) }
                );
                
                await interaction.update({ embeds: [embed], components: [] });
                
                // Clean up the game
                clearTimeout(gameData.timeout);
                interaction.client.games.delete(interaction.message.id);
                return;
            }
            
            // Dealer plays
            let dealerValue = calculateHandValue(game.dealerHand);
            
            // Dealer must hit on 16 or less and stand on 17 or more
            while (dealerValue < 17) {
                game.dealerHand.push(drawCard(game.deck));
                dealerValue = calculateHandValue(game.dealerHand);
            }
            
            // Determine the winner
            game.gameOver = true;
            
            if (dealerValue > 21) {
                game.result = 'dealer_bust_double';
            } else if (playerValue > dealerValue) {
                game.result = 'player_double';
            } else if (dealerValue > playerValue) {
                game.result = 'dealer_double';
            } else {
                game.result = 'push';
            }
            
            const embed = createInfoEmbed(
                'Blackjack - Double Down',
                `${gameData.player}, you doubled down and the game has ended!`
            )
            .addFields(
                { name: 'Your Hand', value: formatHand(game.playerHand, false), inline: true },
                { name: 'Your Value', value: `${playerValue}`, inline: true },
                { name: 'Dealer Hand', value: formatHand(game.dealerHand, false), inline: true },
                { name: 'Dealer Value', value: `${dealerValue}`, inline: true },
                { name: 'Result', value: getResultText(game.result) }
            );
            
            if (game.result === 'player_double' || game.result === 'dealer_bust_double') {
                embed.setColor('#00FF00');
            } else if (game.result === 'dealer_double') {
                embed.setColor('#FF0000');
            }
            
            await interaction.update({ embeds: [embed], components: [] });
            
            // Clean up the game
            clearTimeout(gameData.timeout);
            interaction.client.games.delete(interaction.message.id);
        }
    }
};

function createDeck() {
    const suits = ['♠️', '♥️', '♦️', '♣️'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const deck = [];
    
    for (const suit of suits) {
        for (const rank of ranks) {
            deck.push({ rank, suit });
        }
    }
    
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function drawCard(deck) {
    if (deck.length === 0) {
        // Reshuffle if deck is empty
        const newDeck = createDeck();
        shuffleDeck(newDeck);
        deck.push(...newDeck);
    }
    
    return deck.pop();
}

function calculateCardValue(card) {
    if (card.rank === 'A') {
        return 11; // Ace is initially 11
    } else if (['J', 'Q', 'K'].includes(card.rank)) {
        return 10; // Face cards are 10
    } else {
        return parseInt(card.rank); // Number cards are their value
    }
}

function calculateHandValue(hand) {
    let value = 0;
    let aces = 0;
    
    for (const card of hand) {
        if (card.rank === 'A') {
            aces++;
            value += 11;
        } else if (['J', 'Q', 'K'].includes(card.rank)) {
            value += 10;
        } else if (card.rank !== '?') {
            value += parseInt(card.rank);
        }
    }
    
    // Adjust for aces if needed
    while (value > 21 && aces > 0) {
        value -= 10; // Change an ace from 11 to 1
        aces--;
    }
    
    return value;
}

function formatHand(hand, hidden = false) {
    if (hidden && hand.length > 1) {
        return `${formatCard(hand[0])} | ? | Total cards: ${hand.length}`;
    }
    
    return hand.map(card => formatCard(card)).join(' | ');
}

function formatCard(card) {
    return `${card.rank}${card.suit}`;
}

function getResultText(result) {
    switch (result) {
        case 'blackjack':
            return '🎉 Blackjack! You win 1.5x your bet!';
        case 'player':
            return '🎉 You win!';
        case 'player_double':
            return '🎉 You win 2x your bet!';
        case 'dealer':
            return '❌ Dealer wins!';
        case 'dealer_double':
            return '❌ Dealer wins! You lose 2x your bet!';
        case 'bust':
            return '💥 Bust! You lose!';
        case 'dealer_bust':
            return '🎉 Dealer busts! You win!';
        case 'dealer_bust_double':
            return '🎉 Dealer busts! You win 2x your bet!';
        case 'push':
            return '🤝 Push! It\'s a tie!';
        default:
            return 'Unknown result';
    }
}