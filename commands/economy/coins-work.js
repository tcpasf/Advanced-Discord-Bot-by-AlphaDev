const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { coins } = require('../../utils/database');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');

// List of possible jobs and their messages
const jobs = [
    { name: 'Programmer', messages: [
        'You fixed a critical bug in the server code. The owner was impressed!',
        'You developed a new feature for a client\'s website.',
        'You optimized the database queries, making everything run faster.'
    ]},
    { name: 'Designer', messages: [
        'You created a beautiful logo for a new startup.',
        'Your UI design was praised by the client.',
        'You redesigned the company website, and everyone loves it!'
    ]},
    { name: 'Moderator', messages: [
        'You helped resolve a heated argument in the community.',
        'You cleaned up spam messages and kept the server safe.',
        'You organized a successful community event.'
    ]},
    { name: 'Writer', messages: [
        'You wrote an engaging article that went viral.',
        'Your creative story received positive feedback.',
        'You edited and improved the server rules documentation.'
    ]},
    { name: 'Teacher', messages: [
        'You helped a new member understand how Discord works.',
        'You created a helpful tutorial for the community.',
        'You answered questions in the help channel all day.'
    ]},
    { name: 'Streamer', messages: [
        'Your stream attracted many new members to the server.',
        'You hosted a charity stream and raised awareness.',
        'Your gameplay highlights were featured on the server.'
    ]},
    { name: 'Artist', messages: [
        'You drew a beautiful piece of art for the server banner.',
        'Your emote designs were added to the server.',
        'You created custom artwork for a server event.'
    ]},
    { name: 'Musician', messages: [
        'You performed a song in the voice channel that everyone enjoyed.',
        'Your music playlist for the server was a hit.',
        'You composed a custom theme song for the server.'
    ]}
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Work to earn coins'),
    
    async execute(interaction) {
        try {
            const result = coins.work(interaction.user.id, interaction.guild.id);
            
            if (result.success) {
                const userData = coins.getBalance(interaction.user.id, interaction.guild.id);
                
                // Increment command usage stat
                userData.stats.commandsUsed = (userData.stats.commandsUsed || 0) + 1;
                coins.save();
                
                // Select a random job and message
                const job = jobs[Math.floor(Math.random() * jobs.length)];
                const message = job.messages[Math.floor(Math.random() * job.messages.length)];
                
                const embed = new EmbedBuilder()
                    .setColor('#4CAF50') // Green color
                    .setTitle(`You worked as a ${job.name}!`)
                    .setDescription(`${message}\n\nYou earned **${result.amount.toLocaleString()} coins** for your hard work!`)
                    .addFields(
                        { name: '💰 New Balance', value: `${result.balance.toLocaleString()} coins`, inline: true },
                        { name: '🏦 Bank Balance', value: `${userData.bank.toLocaleString()} coins`, inline: true },
                        { name: '💵 Total', value: `${(userData.balance + userData.bank).toLocaleString()} coins`, inline: true }
                    )
                    .setFooter({ text: 'You can work again in 1 hour' })
                    .setTimestamp();
                
                // Add work streak if applicable
                if (!userData.workStreak) userData.workStreak = { count: 0, lastWork: 0 };
                
                const now = Date.now();
                // Check if this is within 26 hours of last work (to allow for some flexibility)
                if (now - userData.workStreak.lastWork < 93600000) { // 26 hours
                    userData.workStreak.count++;
                    
                    // Give bonus for streaks
                    if (userData.workStreak.count % 5 === 0) {
                        // Bonus for every 5 consecutive work shifts
                        const bonus = Math.floor(result.amount * 0.5); // 50% bonus
                        userData.balance += bonus;
                        embed.addFields({ 
                            name: '🔥 Work Streak Bonus!', 
                            value: `You've worked for **${userData.workStreak.count} consecutive shifts**!\nBonus: **${bonus.toLocaleString()} coins**` 
                        });
                    } else {
                        embed.addFields({ 
                            name: '🔥 Work Streak', 
                            value: `You've worked for **${userData.workStreak.count} consecutive shifts**!` 
                        });
                    }
                } else {
                    // Reset streak
                    userData.workStreak.count = 1;
                }
                
                userData.workStreak.lastWork = now;
                coins.save();
                
                await interaction.reply({ embeds: [embed] });
            } else {
                // Calculate time remaining
                const timeLeft = result.cooldown;
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                
                const embed = createErrorEmbed(
                    'Work Not Available',
                    `You're still tired from your last shift. Please wait **${minutes}m ${seconds}s** before working again.`
                );
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (error) {
            console.error('Error working for coins:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed('Error', 'An error occurred while working for coins.')],
                ephemeral: true
            });
        }
    }
};