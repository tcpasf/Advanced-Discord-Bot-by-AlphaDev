const fs = require('fs');
const path = require('path');
const { settings } = require('./database');

// Cache for translations to avoid reading files repeatedly
const translationsCache = {};

/**
 * Load a language file
 * @param {string} lang - Language code (en, ar, fr)
 * @returns {Object} Translation object
 */
function loadLanguage(lang) {
    // If already cached, return from cache
    if (translationsCache[lang]) {
        return translationsCache[lang];
    }

    try {
        const filePath = path.join(__dirname, '..', 'translations', `${lang}.json`);
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const translations = JSON.parse(data);
            translationsCache[lang] = translations;
            return translations;
        } else {
            console.error(`Translation file for language ${lang} not found.`);
            // Fall back to English if the requested language file doesn't exist
            if (lang !== 'en') {
                return loadLanguage('en');
            }
            return {};
        }
    } catch (error) {
        console.error(`Error loading language file for ${lang}:`, error);
        // Fall back to English on error
        if (lang !== 'en') {
            return loadLanguage('en');
        }
        return {};
    }
}

/**
 * Get a translation string by key
 * @param {string} key - Dot notation path to the translation (e.g., "common.success")
 * @param {string} guildId - Discord guild ID
 * @param {Object} options - Options object
 * @param {Object} options.replacements - Object with replacement values
 * @param {string} options.defaultValue - Default value if translation is not found
 * @returns {string} Translated string
 */
function translate(key, guildId, options = {}) {
    // Handle both old and new parameter formats
    let replacements = {};
    let defaultValue = key;
    
    if (typeof options === 'object') {
        replacements = options.replacements || {};
        if (options.defaultValue) defaultValue = options.defaultValue;
    } else {
        // For backward compatibility
        replacements = options;
    }
    
    // If guildId is null, use English
    if (!guildId) {
        const enTranslations = loadLanguage('en');
        return getTranslationFromObject(enTranslations, key, defaultValue, replacements);
    }
    
    // Get the guild's language setting
    const lang = settings.getLanguage(guildId);
    
    // Load translations for the language
    const translations = loadLanguage(lang);
    
    // Try to get translation in the requested language
    const result = getTranslationFromObject(translations, key, null, replacements);
    
    // If translation not found and language is not English, try English
    if (result === null && lang !== 'en') {
        const enTranslations = loadLanguage('en');
        return getTranslationFromObject(enTranslations, key, defaultValue, replacements);
    }
    
    return result !== null ? result : defaultValue;
}

/**
 * Helper function to get a translation from an object using dot notation
 * @param {Object} obj - Translation object
 * @param {string} key - Dot notation path
 * @param {string} defaultValue - Default value if not found
 * @param {Object} replacements - Replacement values
 * @returns {string|null} Translation or null if not found
 */
function getTranslationFromObject(obj, key, defaultValue, replacements) {
    // Split the key by dots to navigate the translations object
    const keyParts = key.split('.');
    let value = obj;
    
    // Navigate through the object to find the translation
    for (const part of keyParts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        } else {
            return null;
        }
    }
    
    // If the value is not a string, return null
    if (typeof value !== 'string') {
        return null;
    }
    
    // Replace placeholders with values
    let result = value;
    for (const [placeholder, replacement] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{${placeholder}}`, 'g'), replacement);
    }
    
    return result;
}

/**
 * Get all available languages
 * @returns {Array} Array of language objects with code and name
 */
function getAvailableLanguages() {
    return [
        { code: 'en', name: 'English', emoji: '🇬🇧' },
        { code: 'ar', name: 'Arabic', emoji: '🇸🇦' },
        { code: 'fr', name: 'French', emoji: '🇫🇷' }
    ];
}

module.exports = {
    translate,
    getAvailableLanguages,
    loadLanguage
};