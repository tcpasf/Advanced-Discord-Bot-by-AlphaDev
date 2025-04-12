const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createSuccessEmbed, createErrorEmbed } = require('../../utils/embeds');
const { settings } = require('../../utils/database');
const { translate, getAvailableLanguages } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('language-setup')
        .setDescription('Set the bot language for all servers')
        .addStringOption(option => {
            const opt = option.setName('language')
                .setDescription('The language to use')
                .setRequired(true);
            
            // Add language choices dynamically from available languages
            getAvailableLanguages().forEach(lang => {
                opt.addChoices({ name: lang.name, value: lang.code });
            });
            
            return opt;
        })
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    async execute(interaction) {
        try {
            const language = interaction.options.getString('language');
            const guildId = interaction.guild.id;
            
            // Get all guilds from the settings
            const settingsData = settings.get();
            const allGuilds = settingsData.guilds;
            let updatedGuildsCount = 0;
            
            // Update language for all guilds
            for (const currentGuildId in allGuilds) {
                settings.setLanguage(currentGuildId, language);
                updatedGuildsCount++;
            }
            
            // Also set language for the current guild if it's not in the list yet
            if (!allGuilds[guildId]) {
                settings.setLanguage(guildId, language);
                updatedGuildsCount++;
            }
            
            // Get language information
            const languageInfo = getAvailableLanguages().find(lang => lang.code === language);
            
            // Create success embed with the appropriate language message
            const embed = createSuccessEmbed(
                `${languageInfo.emoji} ${languageInfo.name}`,
                translate('language.changed', guildId)
            );
            
            // Add additional information
            embed.addFields(
                { name: translate('common.note', guildId), value: translate('language.note', guildId), inline: false },
                { name: "Global Change", value: `Language has been updated for all ${updatedGuildsCount} servers.`, inline: false }
            );
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error setting language:', error);
            
            await interaction.reply({ 
                embeds: [createErrorEmbed(
                    translate('common.error', interaction.guild.id), 
                    translate('errors.command_error', interaction.guild.id)
                )],
                ephemeral: true
            });
        }
    }
};