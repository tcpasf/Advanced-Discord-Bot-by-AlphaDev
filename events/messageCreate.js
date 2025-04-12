const { autoReplies } = require('../utils/database');

module.exports = {
    name: 'messageCreate',
    once: false,
    async execute(message) {
        // Ignore messages from bots
        if (message.author.bot) return;
        
        // Ignore messages that are not in a guild
        if (!message.guild) return;
        
        // Process auto-replies
        await processAutoReplies(message);
    }
};

async function processAutoReplies(message) {
    try {
        const guildId = message.guild.id;
        const content = message.content;
        
        // Skip empty messages
        if (!content) return;
        
        // Get user roles
        const member = await message.guild.members.fetch(message.author.id).catch(() => null);
        if (!member) return;
        
        const userRoles = member.roles.cache.map(role => role.id);
        
        // Find matching auto-replies
        const matchingReplies = autoReplies.findMatchingReplies(
            guildId, 
            content, 
            message.author.id, 
            message.channel.id, 
            userRoles
        );
        
        // If no matches, return
        if (matchingReplies.length === 0) return;
        
        // Process each matching reply
        for (const reply of matchingReplies) {
            // Mark as used
            autoReplies.markAsUsed(guildId, reply.id);
            
            // Delete original message if configured
            if (reply.deleteOriginal) {
                await message.delete().catch(console.error);
            }
            
            // Send the response
            if (reply.replyInDM) {
                // Send in DM
                await message.author.send(reply.response).catch(console.error);
            } else {
                // Reply in channel
                await message.reply(reply.response).catch(console.error);
            }
        }
    } catch (error) {
        console.error('Error processing auto-replies:', error);
    }
}