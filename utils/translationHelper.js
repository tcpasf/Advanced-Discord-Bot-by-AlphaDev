const { translate } = require('./translations');
const { settings } = require('./database');

/**
 * Helper class to simplify working with translations in commands
 */
class TranslationHelper {
    /**
     * Create a new translation helper for a specific guild
     * @param {string} guildId - The Discord guild ID
     */
    constructor(guildId) {
        this.guildId = guildId;
    }

    /**
     * Get a translation string by key
     * @param {string} key - Dot notation path to the translation
     * @param {Object} replacements - Object with replacement values
     * @returns {string} Translated string
     */
    get(key, replacements = {}) {
        return translate(key, this.guildId, { replacements });
    }

    /**
     * Get the current language code for this guild
     * @returns {string} Language code (e.g., 'en', 'fr', 'ar')
     */
    getLanguage() {
        return settings.getLanguage(this.guildId);
    }

    /**
     * Create a translation helper from a Discord interaction
     * @param {Object} interaction - Discord interaction object
     * @returns {TranslationHelper} Translation helper instance
     */
    static fromInteraction(interaction) {
        const guildId = interaction.guild?.id;
        return new TranslationHelper(guildId);
    }

    /**
     * Create a translation helper from a Discord message
     * @param {Object} message - Discord message object
     * @returns {TranslationHelper} Translation helper instance
     */
    static fromMessage(message) {
        const guildId = message.guild?.id;
        return new TranslationHelper(guildId);
    }

    /**
     * Create a translation helper from a guild ID
     * @param {string} guildId - Discord guild ID
     * @returns {TranslationHelper} Translation helper instance
     */
    static forGuild(guildId) {
        return new TranslationHelper(guildId);
    }
}

module.exports = TranslationHelper;