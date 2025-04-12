const axios = require('axios');
require('dotenv').config();

/**
 * Verify a Discord OAuth2 token and get user information
 * @param {string} token - The Discord OAuth2 token
 * @returns {Promise<Object>} - The user object if token is valid
 */
async function verifyDiscordToken(token) {
    try {
        // Make a request to Discord's API to verify the token
        const response = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        
        // If the request was successful, return the user data
        return response.data;
    } catch (error) {
        console.error('Error verifying Discord token:', error.message);
        throw new Error('Invalid token');
    }
}

/**
 * Exchange an authorization code for an access token
 * @param {string} code - The authorization code from Discord OAuth2
 * @returns {Promise<Object>} - The token response
 */
async function exchangeCode(code) {
    try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;
        
        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error('Missing Discord OAuth2 configuration');
        }
        
        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);
        
        const response = await axios.post('https://discord.com/api/v10/oauth2/token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error exchanging code for token:', error.message);
        throw new Error('Failed to exchange code for token');
    }
}

/**
 * Refresh an access token using a refresh token
 * @param {string} refreshToken - The refresh token
 * @returns {Promise<Object>} - The new token response
 */
async function refreshToken(refreshToken) {
    try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        
        if (!clientId || !clientSecret) {
            throw new Error('Missing Discord OAuth2 configuration');
        }
        
        const params = new URLSearchParams();
        params.append('client_id', clientId);
        params.append('client_secret', clientSecret);
        params.append('grant_type', 'refresh_token');
        params.append('refresh_token', refreshToken);
        
        const response = await axios.post('https://discord.com/api/v10/oauth2/token', params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error refreshing token:', error.message);
        throw new Error('Failed to refresh token');
    }
}

module.exports = {
    verifyDiscordToken,
    exchangeCode,
    refreshToken
};