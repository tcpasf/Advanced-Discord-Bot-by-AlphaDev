const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonStyle } = require('discord.js');
const { translate } = require('./translations');

/**
 * Create a basic embed with optional translation support
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {number} color - Embed color
 * @param {string} guildId - Optional guild ID for translations
 * @param {boolean} useTranslation - Whether to translate title and description
 * @returns {EmbedBuilder} The created embed
 */
function createBasicEmbed(title, description, color = 0x3498db, guildId = null, useTranslation = false) {
    // Translate title and description if needed
    const finalTitle = useTranslation && guildId ? translate(title, guildId) : title;
    const finalDescription = useTranslation && guildId ? translate(description, guildId) : description;
    
    return new EmbedBuilder()
        .setTitle(finalTitle)
        .setDescription(finalDescription)
        .setColor(color)
        .setTimestamp();
}

/**
 * Create a success embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {string} guildId - Optional guild ID for translations
 * @param {boolean} useTranslation - Whether to translate title and description
 * @returns {EmbedBuilder} The created embed
 */
function createSuccessEmbed(title, description, guildId = null, useTranslation = false) {
    return createBasicEmbed(title, description, 0x2ecc71, guildId, useTranslation);
}

/**
 * Create an error embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {string} guildId - Optional guild ID for translations
 * @param {boolean} useTranslation - Whether to translate title and description
 * @returns {EmbedBuilder} The created embed
 */
function createErrorEmbed(title, description, guildId = null, useTranslation = false) {
    return createBasicEmbed(title, description, 0xe74c3c, guildId, useTranslation);
}

/**
 * Create an info embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {string} guildId - Optional guild ID for translations
 * @param {boolean} useTranslation - Whether to translate title and description
 * @returns {EmbedBuilder} The created embed
 */
function createInfoEmbed(title, description, guildId = null, useTranslation = false) {
    return createBasicEmbed(title, description, 0x3498db, guildId, useTranslation);
}

/**
 * Create a warning embed
 * @param {string} title - Embed title
 * @param {string} description - Embed description
 * @param {string} guildId - Optional guild ID for translations
 * @param {boolean} useTranslation - Whether to translate title and description
 * @returns {EmbedBuilder} The created embed
 */
function createWarningEmbed(title, description, guildId = null, useTranslation = false) {
    return createBasicEmbed(title, description, 0xf39c12, guildId, useTranslation);
}

function createButton(label, customId, style = ButtonStyle.Primary, disabled = false, emoji = null, url = null) {
    const button = new ButtonBuilder()
        .setLabel(label)
        .setStyle(style)
        .setDisabled(disabled);
    
    if (style === ButtonStyle.Link) {
        if (!url) throw new Error('URL is required for link buttons');
        button.setURL(url);
    } else {
        button.setCustomId(customId);
    }
    
    if (emoji) button.setEmoji(emoji);
    
    return button;
}

function createActionRow(components) {
    return new ActionRowBuilder().addComponents(components);
}

function createSelectMenu(customId, options, placeholder = 'Select an option', minValues = 1, maxValues = 1, disabled = false) {
    return new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .setMinValues(minValues)
        .setMaxValues(maxValues)
        .setDisabled(disabled)
        .setOptions(options);
}

module.exports = {
    createBasicEmbed,
    createSuccessEmbed,
    createErrorEmbed,
    createInfoEmbed,
    createWarningEmbed,
    createButton,
    createActionRow,
    createSelectMenu
};