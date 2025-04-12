const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("senddm")
        .setDescription("Send a direct message to a user")
        .addUserOption(option =>
            option.setName("user")
                .setDescription("The user to send the message to")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("message")
                .setDescription("The message to send")
                .setRequired(true)
        ),
    
    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const message = interaction.options.getString("message");

        if (user.bot) {
            return interaction.reply({
                content: `**Cannot send messages to bots.**`,
                ephemeral: false,
            });
        }

        const member = interaction.guild.members.cache.get(user.id);
        if (!member) {
            return interaction.reply({
                content: `**User ${user.username} is not in this server.**`,
                ephemeral: false,
            });
        }

        if (message.length > 2000) {
            return interaction.reply({
                content: `**Message is too long. Maximum allowed is 2000 characters.**`,
                ephemeral: false,
            });
        }

        try {
            await user.send(message);
            await interaction.reply({
                content: `**Message sent to ${user.username} successfully.**`,
                ephemeral: false,
            });
        } catch (error) {
            if (error.code === 50007) {
                await interaction.reply({
                    content: `**Cannot send messages to ${user.username}. Their DMs are closed.**`,
                    ephemeral: false,
                });
             }
            }
        }
};