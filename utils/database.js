const fs = require('fs');
const path = require('path');

const DB_FOLDER = path.join(__dirname, '..', 'data');
const RANKS_FILE = path.join(DB_FOLDER, 'ranks.json');
const TICKETS_FILE = path.join(DB_FOLDER, 'tickets.json');
const WARNINGS_FILE = path.join(DB_FOLDER, 'warnings.json');
const WELCOME_FILE = path.join(DB_FOLDER, 'welcome.json');
const MUTES_FILE = path.join(DB_FOLDER, 'mutes.json');
const GIVEAWAYS_FILE = path.join(DB_FOLDER, 'giveaways.json');
const COINS_FILE = path.join(DB_FOLDER, 'coins.json');
const VERIFICATION_FILE = path.join(DB_FOLDER, 'verification.json');
const SETTINGS_FILE = path.join(DB_FOLDER, 'settings.json');
const AUTO_REPLIES_FILE = path.join(DB_FOLDER, 'auto-replies.json');
const LOGS_FILE = path.join(DB_FOLDER, 'logs.json');

if (!fs.existsSync(DB_FOLDER)) {
    fs.mkdirSync(DB_FOLDER, { recursive: true });
}

function initializeFile(filePath, defaultData = {}) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
    
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
        return defaultData;
    }
}

function saveData(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

const ranks = initializeFile(RANKS_FILE, { users: {}, voiceRanks: {} });
const tickets = initializeFile(TICKETS_FILE, { 
    config: {}, 
    activeTickets: {},
    blacklist: {},
    ticketCounts: {},
    tempTicketData: {}
});

// Ensure tempTicketData exists
if (!tickets.tempTicketData) {
    tickets.tempTicketData = {};
    saveData(TICKETS_FILE, tickets);
}
const warnings = initializeFile(WARNINGS_FILE, {});
const welcome = initializeFile(WELCOME_FILE, {});
const mutes = initializeFile(MUTES_FILE, { 
    textMutes: {},
    voiceMutes: {}
});
const giveawaysData = initializeFile(GIVEAWAYS_FILE, {
    active: {},
    ended: {}
});

// Initialize settings data
const settingsData = initializeFile(SETTINGS_FILE, {
    guilds: {},
    global: {
        version: '1.0.0',
        lastUpdated: Date.now()
    }
});

// Initialize logs data
const logsData = initializeFile(LOGS_FILE, {});

// Coins and verification data are initialized below

const coinsData = initializeFile(COINS_FILE, {
    users: {},
    shop: {},
    transactions: [],
    settings: {
        dailyAmount: 100,
        weeklyAmount: 500,
        workMinAmount: 50,
        workMaxAmount: 200,
        workCooldown: 3600000, // 1 hour
        dailyCooldown: 86400000, // 24 hours
        weeklyCooldown: 604800000, // 7 days
        messageReward: 1,
        messageRewardCooldown: 60000, // 1 minute
        voiceReward: 5, // per minute
        voiceRewardCooldown: 60000 // 1 minute
    },
    leaderboard: {}
});

const verificationData = initializeFile(VERIFICATION_FILE, {
    settings: {},
    pendingVerifications: {},
    verifiedUsers: {},
    captchaSettings: {
        enabled: true,
        difficulty: 'medium',
        expiry: 300000, // 5 minutes
        maxAttempts: 3
    },
    logs: []
});

// Initialize auto-replies data
const autoRepliesData = initializeFile(AUTO_REPLIES_FILE, {
    replies: {}
});

module.exports = {
    // Settings management
    settings: {
        get: () => settingsData,
        save: () => saveData(SETTINGS_FILE, settingsData),
        
        // Get settings for a guild
        getGuildSettings: (guildId) => {
            if (!settingsData.guilds[guildId]) {
                settingsData.guilds[guildId] = {
                    prefix: '!',
                    language: 'en',
                    commandChannels: [],
                    disabledCommands: [],
                    modLogChannel: null,
                    muteRole: null,
                    autoMod: {
                        antiSpam: false,
                        antiInvite: false,
                        antiLink: false
                    }
                };
            }
            return settingsData.guilds[guildId];
        },
        
        // Update settings for a guild
        updateGuildSettings: (guildId, settings) => {
            if (!settingsData.guilds[guildId]) {
                settingsData.guilds[guildId] = {};
            }
            
            // Update settings
            settingsData.guilds[guildId] = {
                ...settingsData.guilds[guildId],
                ...settings
            };
            
            // Save to file
            saveData(SETTINGS_FILE, settingsData);
            return settingsData.guilds[guildId];
        }
    },
    
    // Welcome system
    welcome: {
        get: () => welcome,
        save: () => saveData(WELCOME_FILE, welcome),
        
        // Get welcome settings for a guild
        getGuildWelcome: (guildId) => {
            if (!welcome[guildId]) {
                welcome[guildId] = {
                    enabled: false,
                    channel: null,
                    message: 'Welcome {user} to {server}! You are our {memberCount}th member!',
                    imageEnabled: false,
                    imageUrl: null,
                    dmEnabled: false,
                    dmMessage: null,
                    autoRoles: []
                };
            }
            return welcome[guildId];
        },
        
        // Update welcome settings for a guild
        updateGuildWelcome: (guildId, settings) => {
            if (!welcome[guildId]) {
                welcome[guildId] = {};
            }
            
            // Update settings
            welcome[guildId] = {
                ...welcome[guildId],
                ...settings
            };
            
            // Save to file
            saveData(WELCOME_FILE, welcome);
            return welcome[guildId];
        }
    },
    
    // Logs system
    logs: {
        get: () => logsData,
        save: () => saveData(LOGS_FILE, logsData),
        
        // Add a log entry
        addLog: (guildId, action, data) => {
            if (!logsData[guildId]) {
                logsData[guildId] = [];
            }
            
            // Create log entry
            const logEntry = {
                action,
                ...data,
                timestamp: Date.now()
            };
            
            // Add to logs
            logsData[guildId].unshift(logEntry);
            
            // Limit logs to 1000 entries per guild
            if (logsData[guildId].length > 1000) {
                logsData[guildId] = logsData[guildId].slice(0, 1000);
            }
            
            // Save to file
            saveData(LOGS_FILE, logsData);
            return logEntry;
        },
        
        // Get logs for a guild
        getGuildLogs: (guildId) => {
            return logsData[guildId] || [];
        }
    },
    
    autoReplies: {
        get: () => autoRepliesData,
        save: () => saveData(AUTO_REPLIES_FILE, autoRepliesData),
        
        // Get all auto-replies for a guild
        getGuildReplies: (guildId) => {
            if (!autoRepliesData.replies[guildId]) {
                autoRepliesData.replies[guildId] = [];
            }
            return autoRepliesData.replies[guildId];
        },
        
        // Add a new auto-reply
        addReply: (guildId, trigger, response, options = {}) => {
            const replies = module.exports.autoReplies.getGuildReplies(guildId);
            
            // Generate a unique ID for the reply
            const replyId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            
            // Create the new reply object
            const newReply = {
                id: replyId,
                trigger: trigger,
                response: response,
                createdAt: Date.now(),
                enabled: true,
                matchType: options.matchType || 'contains', // 'contains', 'exact', 'startsWith', 'endsWith', 'regex'
                caseSensitive: options.caseSensitive || false,
                chance: options.chance || 100, // Percentage chance to reply (1-100)
                cooldown: options.cooldown || 0, // Cooldown in milliseconds
                lastUsed: 0, // Timestamp of last use
                useCount: 0, // Number of times this reply has been used
                allowedChannels: options.allowedChannels || [], // Empty array means all channels
                excludedChannels: options.excludedChannels || [],
                allowedRoles: options.allowedRoles || [], // Empty array means all roles
                excludedRoles: options.excludedRoles || [],
                deleteOriginal: options.deleteOriginal || false, // Whether to delete the original message
                replyInDM: options.replyInDM || false // Whether to send the reply in DM
            };
            
            replies.push(newReply);
            saveData(AUTO_REPLIES_FILE, autoRepliesData);
            return newReply;
        },
        
        // Edit an existing auto-reply
        editReply: (guildId, replyId, updates) => {
            const replies = module.exports.autoReplies.getGuildReplies(guildId);
            const replyIndex = replies.findIndex(reply => reply.id === replyId);
            
            if (replyIndex === -1) {
                return null;
            }
            
            // Update the reply with new values
            replies[replyIndex] = {
                ...replies[replyIndex],
                ...updates,
                updatedAt: Date.now()
            };
            
            saveData(AUTO_REPLIES_FILE, autoRepliesData);
            return replies[replyIndex];
        },
        
        // Remove an auto-reply
        removeReply: (guildId, replyId) => {
            const replies = module.exports.autoReplies.getGuildReplies(guildId);
            const initialLength = replies.length;
            
            autoRepliesData.replies[guildId] = replies.filter(reply => reply.id !== replyId);
            
            if (autoRepliesData.replies[guildId].length < initialLength) {
                saveData(AUTO_REPLIES_FILE, autoRepliesData);
                return true;
            }
            
            return false;
        },
        
        // Get a specific auto-reply by ID
        getReply: (guildId, replyId) => {
            const replies = module.exports.autoReplies.getGuildReplies(guildId);
            return replies.find(reply => reply.id === replyId) || null;
        },
        
        // Check if a message matches any auto-reply triggers
        findMatchingReplies: (guildId, message, userId, channelId, userRoles = []) => {
            const replies = module.exports.autoReplies.getGuildReplies(guildId);
            const now = Date.now();
            const matches = [];
            
            for (const reply of replies) {
                // Skip disabled replies
                if (!reply.enabled) continue;
                
                // Check cooldown
                if (reply.cooldown > 0 && (now - reply.lastUsed) < reply.cooldown) continue;
                
                // Check channel restrictions
                if (reply.allowedChannels.length > 0 && !reply.allowedChannels.includes(channelId)) continue;
                if (reply.excludedChannels.length > 0 && reply.excludedChannels.includes(channelId)) continue;
                
                // Check role restrictions
                if (reply.allowedRoles.length > 0 && !userRoles.some(role => reply.allowedRoles.includes(role))) continue;
                if (reply.excludedRoles.length > 0 && userRoles.some(role => reply.excludedRoles.includes(role))) continue;
                
                // Check random chance
                if (reply.chance < 100 && Math.random() * 100 > reply.chance) continue;
                
                // Check if message matches the trigger
                let messageContent = message;
                let trigger = reply.trigger;
                
                if (!reply.caseSensitive) {
                    messageContent = messageContent.toLowerCase();
                    trigger = trigger.toLowerCase();
                }
                
                let isMatch = false;
                
                switch (reply.matchType) {
                    case 'exact':
                        isMatch = messageContent === trigger;
                        break;
                    case 'contains':
                        isMatch = messageContent.includes(trigger);
                        break;
                    case 'startsWith':
                        isMatch = messageContent.startsWith(trigger);
                        break;
                    case 'endsWith':
                        isMatch = messageContent.endsWith(trigger);
                        break;
                    case 'regex':
                        try {
                            const regex = new RegExp(trigger, reply.caseSensitive ? '' : 'i');
                            isMatch = regex.test(messageContent);
                        } catch (error) {
                            console.error(`Invalid regex in auto-reply (${reply.id}):`, error);
                        }
                        break;
                }
                
                if (isMatch) {
                    matches.push(reply);
                }
            }
            
            return matches;
        },
        
        // Mark a reply as used
        markAsUsed: (guildId, replyId) => {
            const reply = module.exports.autoReplies.getReply(guildId, replyId);
            if (reply) {
                reply.lastUsed = Date.now();
                reply.useCount++;
                saveData(AUTO_REPLIES_FILE, autoRepliesData);
            }
        }
    },
    
    coins: {
        get: () => coinsData,
        save: () => saveData(COINS_FILE, coinsData),
        
        // User balance management
        getBalance: (userId, guildId) => {
            if (!coinsData.users[guildId]) coinsData.users[guildId] = {};
            if (!coinsData.users[guildId][userId]) {
                coinsData.users[guildId][userId] = {
                    balance: 0,
                    bank: 0,
                    lastDaily: 0,
                    lastWeekly: 0,
                    lastWork: 0,
                    lastMessage: 0,
                    inventory: [],
                    stats: {
                        totalEarned: 0,
                        totalSpent: 0,
                        commandsUsed: 0
                    }
                };
            }
            return coinsData.users[guildId][userId];
        },
        
        addCoins: (userId, guildId, amount, source = 'unknown') => {
            const userData = module.exports.coins.getBalance(userId, guildId);
            userData.balance += amount;
            userData.stats.totalEarned += amount;
            
            // Add transaction record
            coinsData.transactions.push({
                userId,
                guildId,
                amount,
                type: 'add',
                source,
                balance: userData.balance,
                timestamp: Date.now()
            });
            
            // Limit transaction history to 1000 entries
            if (coinsData.transactions.length > 1000) {
                coinsData.transactions = coinsData.transactions.slice(-1000);
            }
            
            saveData(COINS_FILE, coinsData);
            return userData;
        },
        
        removeCoins: (userId, guildId, amount, reason = 'unknown') => {
            const userData = module.exports.coins.getBalance(userId, guildId);
            
            // Check if user has enough coins
            if (userData.balance < amount) {
                return false;
            }
            
            userData.balance -= amount;
            userData.stats.totalSpent += amount;
            
            // Add transaction record
            coinsData.transactions.push({
                userId,
                guildId,
                amount: -amount,
                type: 'remove',
                source: reason,
                balance: userData.balance,
                timestamp: Date.now()
            });
            
            saveData(COINS_FILE, coinsData);
            return userData;
        },
        
        // Bank operations
        deposit: (userId, guildId, amount) => {
            const userData = module.exports.coins.getBalance(userId, guildId);
            
            // Check if user has enough coins
            if (userData.balance < amount) {
                return false;
            }
            
            userData.balance -= amount;
            userData.bank += amount;
            
            // Add transaction record
            coinsData.transactions.push({
                userId,
                guildId,
                amount,
                type: 'deposit',
                source: 'bank',
                balance: userData.balance,
                bankBalance: userData.bank,
                timestamp: Date.now()
            });
            
            saveData(COINS_FILE, coinsData);
            return userData;
        },
        
        withdraw: (userId, guildId, amount) => {
            const userData = module.exports.coins.getBalance(userId, guildId);
            
            // Check if user has enough coins in bank
            if (userData.bank < amount) {
                return false;
            }
            
            userData.bank -= amount;
            userData.balance += amount;
            
            // Add transaction record
            coinsData.transactions.push({
                userId,
                guildId,
                amount,
                type: 'withdraw',
                source: 'bank',
                balance: userData.balance,
                bankBalance: userData.bank,
                timestamp: Date.now()
            });
            
            saveData(COINS_FILE, coinsData);
            return userData;
        },
        
        // Reward functions
        claimDaily: (userId, guildId) => {
            const userData = module.exports.coins.getBalance(userId, guildId);
            const now = Date.now();
            
            // Check if daily reward is available
            if (userData.lastDaily && now - userData.lastDaily < coinsData.settings.dailyCooldown) {
                return {
                    success: false,
                    cooldown: userData.lastDaily + coinsData.settings.dailyCooldown - now
                };
            }
            
            // Give daily reward
            const amount = coinsData.settings.dailyAmount;
            userData.balance += amount;
            userData.lastDaily = now;
            userData.stats.totalEarned += amount;
            
            // Add transaction record
            coinsData.transactions.push({
                userId,
                guildId,
                amount,
                type: 'add',
                source: 'daily',
                balance: userData.balance,
                timestamp: now
            });
            
            saveData(COINS_FILE, coinsData);
            
            return {
                success: true,
                amount,
                balance: userData.balance
            };
        },
        
        claimWeekly: (userId, guildId) => {
            const userData = module.exports.coins.getBalance(userId, guildId);
            const now = Date.now();
            
            // Check if weekly reward is available
            if (userData.lastWeekly && now - userData.lastWeekly < coinsData.settings.weeklyCooldown) {
                return {
                    success: false,
                    cooldown: userData.lastWeekly + coinsData.settings.weeklyCooldown - now
                };
            }
            
            // Give weekly reward
            const amount = coinsData.settings.weeklyAmount;
            userData.balance += amount;
            userData.lastWeekly = now;
            userData.stats.totalEarned += amount;
            
            // Add transaction record
            coinsData.transactions.push({
                userId,
                guildId,
                amount,
                type: 'add',
                source: 'weekly',
                balance: userData.balance,
                timestamp: now
            });
            
            saveData(COINS_FILE, coinsData);
            
            return {
                success: true,
                amount,
                balance: userData.balance
            };
        },
        
        work: (userId, guildId) => {
            const userData = module.exports.coins.getBalance(userId, guildId);
            const now = Date.now();
            
            // Check if work is available
            if (userData.lastWork && now - userData.lastWork < coinsData.settings.workCooldown) {
                return {
                    success: false,
                    cooldown: userData.lastWork + coinsData.settings.workCooldown - now
                };
            }
            
            // Calculate work reward
            const min = coinsData.settings.workMinAmount;
            const max = coinsData.settings.workMaxAmount;
            const amount = Math.floor(Math.random() * (max - min + 1)) + min;
            
            userData.balance += amount;
            userData.lastWork = now;
            userData.stats.totalEarned += amount;
            
            // Add transaction record
            coinsData.transactions.push({
                userId,
                guildId,
                amount,
                type: 'add',
                source: 'work',
                balance: userData.balance,
                timestamp: now
            });
            
            saveData(COINS_FILE, coinsData);
            
            return {
                success: true,
                amount,
                balance: userData.balance
            };
        },
        
        // Shop functions
        getShopItems: (guildId) => {
            if (!coinsData.shop[guildId]) coinsData.shop[guildId] = [];
            return coinsData.shop[guildId];
        },
        
        addShopItem: (guildId, item) => {
            if (!coinsData.shop[guildId]) coinsData.shop[guildId] = [];
            
            // Generate a unique ID for the item
            item.id = Date.now().toString();
            
            coinsData.shop[guildId].push(item);
            saveData(COINS_FILE, coinsData);
            return item;
        },
        
        removeShopItem: (guildId, itemId) => {
            if (!coinsData.shop[guildId]) return false;
            
            const initialLength = coinsData.shop[guildId].length;
            coinsData.shop[guildId] = coinsData.shop[guildId].filter(item => item.id !== itemId);
            
            if (coinsData.shop[guildId].length < initialLength) {
                saveData(COINS_FILE, coinsData);
                return true;
            }
            
            return false;
        },
        
        buyItem: (userId, guildId, itemId) => {
            if (!coinsData.shop[guildId]) return { success: false, reason: 'shop_not_found' };
            
            const item = coinsData.shop[guildId].find(item => item.id === itemId);
            if (!item) return { success: false, reason: 'item_not_found' };
            
            const userData = module.exports.coins.getBalance(userId, guildId);
            
            // Check if user has enough coins
            if (userData.balance < item.price) {
                return { success: false, reason: 'insufficient_funds' };
            }
            
            // Remove coins and add item to inventory
            userData.balance -= item.price;
            userData.stats.totalSpent += item.price;
            
            if (!userData.inventory) userData.inventory = [];
            userData.inventory.push({
                ...item,
                purchasedAt: Date.now()
            });
            
            // Add transaction record
            coinsData.transactions.push({
                userId,
                guildId,
                amount: -item.price,
                type: 'purchase',
                source: `shop_item:${item.name}`,
                balance: userData.balance,
                timestamp: Date.now(),
                itemId: item.id
            });
            
            saveData(COINS_FILE, coinsData);
            
            return {
                success: true,
                item,
                balance: userData.balance
            };
        },
        
        // Settings functions
        getSettings: () => coinsData.settings,
        
        updateSettings: (settings) => {
            coinsData.settings = { ...coinsData.settings, ...settings };
            saveData(COINS_FILE, coinsData);
            return coinsData.settings;
        },
        
        // Leaderboard
        getLeaderboard: (guildId, type = 'balance', limit = 10) => {
            if (!coinsData.users[guildId]) return [];
            
            const users = Object.entries(coinsData.users[guildId]).map(([userId, data]) => ({
                userId,
                ...data
            }));
            
            if (type === 'balance') {
                return users
                    .sort((a, b) => b.balance - a.balance)
                    .slice(0, limit);
            } else if (type === 'bank') {
                return users
                    .sort((a, b) => b.bank - a.bank)
                    .slice(0, limit);
            } else if (type === 'total') {
                return users
                    .sort((a, b) => (b.balance + b.bank) - (a.balance + a.bank))
                    .slice(0, limit);
            }
            
            return [];
        }
    },
    
    verification: {
        get: () => verificationData,
        save: () => saveData(VERIFICATION_FILE, verificationData),
        
        // Settings management
        getSettings: (guildId) => {
            if (!verificationData.settings[guildId]) {
                verificationData.settings[guildId] = {
                    enabled: false,
                    verificationChannelId: null,
                    logChannelId: null,
                    verifiedRoleId: null,
                    unverifiedRoleId: null,
                    welcomeMessage: 'Welcome to the server! Please verify yourself to access all channels.',
                    successMessage: 'You have been successfully verified!',
                    method: 'captcha', // captcha, reaction, or custom
                    autoKick: false,
                    autoKickTimeout: 1800000, // 30 minutes
                    captchaSettings: {
                        difficulty: 'medium',
                        expireTime: 300000 // 5 minutes
                    }
                };
            }
            return verificationData.settings[guildId];
        },
        
        updateSettings: (guildId, settings) => {
            if (!verificationData.settings[guildId]) {
                verificationData.settings[guildId] = {};
            }
            
            verificationData.settings[guildId] = {
                ...verificationData.settings[guildId],
                ...settings
            };
            
            saveData(VERIFICATION_FILE, verificationData);
            return verificationData.settings[guildId];
        },
        
        // Verification management
        createVerification: (userId, guildId, data) => {
            if (!verificationData.pendingVerifications[guildId]) {
                verificationData.pendingVerifications[guildId] = {};
            }
            
            verificationData.pendingVerifications[guildId][userId] = {
                ...data,
                timestamp: Date.now()
            };
            
            saveData(VERIFICATION_FILE, verificationData);
            return verificationData.pendingVerifications[guildId][userId];
        },
        
        getVerification: (userId, guildId) => {
            if (!verificationData.pendingVerifications[guildId]) return null;
            return verificationData.pendingVerifications[guildId][userId] || null;
        },
        
        completeVerification: (userId, guildId) => {
            // Remove from pending
            if (verificationData.pendingVerifications[guildId] && 
                verificationData.pendingVerifications[guildId][userId]) {
                delete verificationData.pendingVerifications[guildId][userId];
            }
            
            // Add to verified
            if (!verificationData.verifiedUsers[guildId]) {
                verificationData.verifiedUsers[guildId] = {};
            }
            
            verificationData.verifiedUsers[guildId][userId] = {
                timestamp: Date.now(),
                method: 'captcha'
            };
            
            saveData(VERIFICATION_FILE, verificationData);
            return true;
        },
        
        isVerified: (userId, guildId) => {
            if (!verificationData.verifiedUsers[guildId]) return false;
            return !!verificationData.verifiedUsers[guildId][userId];
        },
        
        removeVerification: (userId, guildId) => {
            let removed = false;
            
            // Remove from pending
            if (verificationData.pendingVerifications[guildId] && 
                verificationData.pendingVerifications[guildId][userId]) {
                delete verificationData.pendingVerifications[guildId][userId];
                removed = true;
            }
            
            // Remove from verified
            if (verificationData.verifiedUsers[guildId] && 
                verificationData.verifiedUsers[guildId][userId]) {
                delete verificationData.verifiedUsers[guildId][userId];
                removed = true;
            }
            
            if (removed) {
                saveData(VERIFICATION_FILE, verificationData);
            }
            
            return removed;
        },
        
        // Captcha settings
        getCaptchaSettings: () => verificationData.captchaSettings,
        
        updateCaptchaSettings: (settings) => {
            verificationData.captchaSettings = {
                ...verificationData.captchaSettings,
                ...settings
            };
            
            saveData(VERIFICATION_FILE, verificationData);
            return verificationData.captchaSettings;
        }
    },
    
    ranks: {
        get: () => ranks,
        save: () => saveData(RANKS_FILE, ranks),
        getUserRank: (userId, guildId) => {
            if (!ranks.users[guildId]) ranks.users[guildId] = {};
            return ranks.users[guildId][userId] || { xp: 0, level: 0 };
        },
        setUserRank: (userId, guildId, rankData) => {
            if (!ranks.users[guildId]) ranks.users[guildId] = {};
            ranks.users[guildId][userId] = rankData;
            saveData(RANKS_FILE, ranks);
        },
        addXP: (userId, guildId, xpAmount) => {
            const userRank = module.exports.ranks.getUserRank(userId, guildId);
            userRank.xp += xpAmount;
            
            const xpNeeded = 5 * Math.pow(userRank.level, 2) + 50 * userRank.level + 100;
            
            if (userRank.xp >= xpNeeded) {
                userRank.level++;
                userRank.xp -= xpNeeded;
            }
            
            module.exports.ranks.setUserRank(userId, guildId, userRank);
            return userRank;
        }
    },
    tickets: {
        get: () => tickets,
        save: () => saveData(TICKETS_FILE, tickets),
        getConfig: (guildId) => {
            if (!tickets.config[guildId]) {
                tickets.config[guildId] = {
                    enabled: false,
                    openCategory: null,
                    logChannel: null,
                    closedCategory: null,
                    transcriptCategory: null,
                    supportRoles: [],
                    panelMessageId: null,
                    panelChannelId: null
                };
            }
            return tickets.config[guildId];
        },
        // Alias for getConfig to maintain compatibility
        getSettings: (guildId) => {
            return module.exports.tickets.getConfig(guildId);
        },
        setConfig: (guildId, config) => {
            if (!tickets.config[guildId]) {
                tickets.config[guildId] = {};
            }
            tickets.config[guildId] = {...tickets.config[guildId], ...config};
            saveData(TICKETS_FILE, tickets);
        },
        // Alias for setConfig to maintain compatibility
        updateSettings: (guildId, settings) => {
            return module.exports.tickets.setConfig(guildId, settings);
        },
        getTicket: (ticketId) => tickets.activeTickets[ticketId] || null,
        createTicket: (ticketId, ticketData) => {
            tickets.activeTickets[ticketId] = ticketData;
            saveData(TICKETS_FILE, tickets);
        },
        updateTicket: (ticketId, ticketData) => {
            if (tickets.activeTickets[ticketId]) {
                tickets.activeTickets[ticketId] = ticketData;
                saveData(TICKETS_FILE, tickets);
                return true;
            }
            return false;
        },
        closeTicket: (ticketId) => {
            delete tickets.activeTickets[ticketId];
            saveData(TICKETS_FILE, tickets);
        },
        getUserTickets: (guildId, userId) => {
            const userTickets = [];
            for (const ticketId in tickets.activeTickets) {
                const ticket = tickets.activeTickets[ticketId];
                if (ticket.guildId === guildId && ticket.userId === userId) {
                    userTickets.push(ticket);
                }
            }
            return userTickets;
        },
        isBlacklisted: (guildId, userId) => {
            if (!tickets.blacklist[guildId]) return false;
            return tickets.blacklist[guildId].includes(userId);
        },
        addToBlacklist: (guildId, userId) => {
            if (!tickets.blacklist[guildId]) tickets.blacklist[guildId] = [];
            if (!tickets.blacklist[guildId].includes(userId)) {
                tickets.blacklist[guildId].push(userId);
                saveData(TICKETS_FILE, tickets);
                return true;
            }
            return false;
        },
        // Alias for addToBlacklist
        blacklistUser: (guildId, userId, reason, moderatorId) => {
            return module.exports.tickets.addToBlacklist(guildId, userId);
        },
        removeFromBlacklist: (guildId, userId) => {
            if (!tickets.blacklist[guildId]) return false;
            const index = tickets.blacklist[guildId].indexOf(userId);
            if (index !== -1) {
                tickets.blacklist[guildId].splice(index, 1);
                saveData(TICKETS_FILE, tickets);
                return true;
            }
            return false;
        },
        // Alias for removeFromBlacklist
        unblacklistUser: (guildId, userId) => {
            return module.exports.tickets.removeFromBlacklist(guildId, userId);
        },
        getTicketCount: (guildId) => {
            if (!guildId) {
                console.error('getTicketCount called with undefined guildId');
                return 0;
            }
            
            if (!tickets.ticketCounts) {
                tickets.ticketCounts = {};
            }
            
            if (!tickets.ticketCounts[guildId]) {
                tickets.ticketCounts[guildId] = 0;
            }
            return tickets.ticketCounts[guildId];
        },
        incrementTicketCount: (guildId) => {
            if (!guildId) {
                console.error('incrementTicketCount called with undefined guildId');
                return 0;
            }
            
            if (!tickets.ticketCounts) {
                tickets.ticketCounts = {};
            }
            
            if (!tickets.ticketCounts[guildId]) {
                tickets.ticketCounts[guildId] = 0;
            }
            tickets.ticketCounts[guildId]++;
            saveData(TICKETS_FILE, tickets);
            return tickets.ticketCounts[guildId];
        },
        setTemporaryTicketData: (userId, data) => {
            if (!tickets.tempTicketData) {
                tickets.tempTicketData = {};
            }
            tickets.tempTicketData[userId] = {
                ...data,
                timestamp: Date.now()
            };
            saveData(TICKETS_FILE, tickets);
        },
        getTemporaryTicketData: (userId) => {
            if (!tickets.tempTicketData) {
                tickets.tempTicketData = {};
                saveData(TICKETS_FILE, tickets);
                return null;
            }
            
            const data = tickets.tempTicketData[userId];
            
            // Check if data exists and is not expired (30 minutes)
            if (data && (Date.now() - data.timestamp) < 1800000) {
                return data;
            }
            
            // Clean up expired data
            if (tickets.tempTicketData[userId]) {
                delete tickets.tempTicketData[userId];
                saveData(TICKETS_FILE, tickets);
            }
            
            return null;
        },
        updateTemporaryTicketData: (userId, data) => {
            if (!tickets.tempTicketData) {
                tickets.tempTicketData = {};
            }
            
            if (!tickets.tempTicketData[userId]) {
                tickets.tempTicketData[userId] = { timestamp: Date.now() };
            }
            
            tickets.tempTicketData[userId] = {
                ...tickets.tempTicketData[userId],
                ...data,
                timestamp: Date.now()
            };
            
            saveData(TICKETS_FILE, tickets);
        },
        clearTemporaryTicketData: (userId) => {
            if (!tickets.tempTicketData) {
                tickets.tempTicketData = {};
                return;
            }
            
            if (tickets.tempTicketData[userId]) {
                delete tickets.tempTicketData[userId];
                saveData(TICKETS_FILE, tickets);
            }
        }
    },
    warnings: {
        get: () => warnings,
        save: () => saveData(WARNINGS_FILE, warnings),
        getUserWarnings: (userId, guildId) => {
            if (!warnings[guildId]) warnings[guildId] = {};
            return warnings[guildId][userId] || [];
        },
        addWarning: (userId, guildId, warning) => {
            if (!warnings[guildId]) warnings[guildId] = {};
            if (!warnings[guildId][userId]) warnings[guildId][userId] = [];
            
            const warningObj = {
                id: Date.now().toString(),
                reason: warning.reason,
                moderator: warning.moderator,
                timestamp: warning.timestamp || Date.now()
            };
            
            warnings[guildId][userId].push(warningObj);
            saveData(WARNINGS_FILE, warnings);
            return warningObj;
        },
        removeWarning: (userId, guildId, warningId) => {
            if (!warnings[guildId] || !warnings[guildId][userId]) return false;
            
            const initialLength = warnings[guildId][userId].length;
            warnings[guildId][userId] = warnings[guildId][userId].filter(w => w.id !== warningId);
            
            if (warnings[guildId][userId].length < initialLength) {
                saveData(WARNINGS_FILE, warnings);
                return true;
            }
            
            return false;
        }
    },
    welcome: {
        get: () => welcome,
        save: () => saveData(WELCOME_FILE, welcome),
        getConfig: (guildId) => {
            if (!welcome[guildId]) {
                welcome[guildId] = {
                    enabled: false,
                    channel: null,
                    message: "Welcome {user} to {server}!",
                    dmMessage: "",
                    sendDM: false,
                    role: null
                };
            }
            return welcome[guildId];
        },
        setConfig: (guildId, config) => {
            welcome[guildId] = config;
            saveData(WELCOME_FILE, welcome);
        }
    },
    mutes: {
        get: () => mutes,
        save: () => saveData(MUTES_FILE, mutes),
        getTextMutes: (guildId) => {
            if (!mutes.textMutes[guildId]) mutes.textMutes[guildId] = {};
            return mutes.textMutes[guildId];
        },
        getVoiceMutes: (guildId) => {
            if (!mutes.voiceMutes[guildId]) mutes.voiceMutes[guildId] = {};
            return mutes.voiceMutes[guildId];
        },
        addTextMute: (guildId, userId, muteData) => {
            if (!mutes.textMutes[guildId]) mutes.textMutes[guildId] = {};
            mutes.textMutes[guildId][userId] = muteData;
            saveData(MUTES_FILE, mutes);
        },
        removeTextMute: (guildId, userId) => {
            if (!mutes.textMutes[guildId]) return false;
            if (mutes.textMutes[guildId][userId]) {
                delete mutes.textMutes[guildId][userId];
                saveData(MUTES_FILE, mutes);
                return true;
            }
            return false;
        },
        addVoiceMute: (guildId, userId, muteData) => {
            if (!mutes.voiceMutes[guildId]) mutes.voiceMutes[guildId] = {};
            mutes.voiceMutes[guildId][userId] = muteData;
            saveData(MUTES_FILE, mutes);
        },
        removeVoiceMute: (guildId, userId) => {
            if (!mutes.voiceMutes[guildId]) return false;
            if (mutes.voiceMutes[guildId][userId]) {
                delete mutes.voiceMutes[guildId][userId];
                saveData(MUTES_FILE, mutes);
                return true;
            }
            return false;
        }
    },
    giveaways: {
        get: () => giveawaysData,
        save: () => saveData(GIVEAWAYS_FILE, giveawaysData),
        createGiveaway: (giveaway) => {
            const id = Date.now().toString();
            giveaway.id = id;
            giveawaysData.active[id] = giveaway;
            saveData(GIVEAWAYS_FILE, giveawaysData);
            return id;
        },
        getGiveawayById: (id) => {
            return giveawaysData.active[id] || giveawaysData.ended[id] || null;
        },
        getGiveawayByMessageId: (messageId) => {
            // Search in active giveaways
            for (const id in giveawaysData.active) {
                if (giveawaysData.active[id].messageId === messageId) {
                    return giveawaysData.active[id];
                }
            }
            
            // Search in ended giveaways
            for (const id in giveawaysData.ended) {
                if (giveawaysData.ended[id].messageId === messageId) {
                    return giveawaysData.ended[id];
                }
            }
            
            return null;
        },
        updateGiveaway: (giveaway) => {
            if (giveaway.ended) {
                // Move to ended giveaways
                delete giveawaysData.active[giveaway.id];
                giveawaysData.ended[giveaway.id] = giveaway;
            } else {
                // Update active giveaway
                giveawaysData.active[giveaway.id] = giveaway;
            }
            
            saveData(GIVEAWAYS_FILE, giveawaysData);
        },
        deleteGiveaway: (id) => {
            if (giveawaysData.active[id]) {
                delete giveawaysData.active[id];
                saveData(GIVEAWAYS_FILE, giveawaysData);
                return true;
            }
            
            if (giveawaysData.ended[id]) {
                delete giveawaysData.ended[id];
                saveData(GIVEAWAYS_FILE, giveawaysData);
                return true;
            }
            
            return false;
        },
        getActiveGiveaways: () => {
            return Object.values(giveawaysData.active);
        },
        getEndedGiveaways: () => {
            return Object.values(giveawaysData.ended);
        }
    },
    
    welcome: {
        get: () => welcome,
        save: () => saveData(WELCOME_FILE, welcome),
        getSettings: (guildId) => {
            if (!welcome[guildId]) {
                welcome[guildId] = {
                    enabled: false,
                    channelId: null,
                    message: 'Welcome {user} to {server}! You are member #{count}.',
                    useImage: false,
                    color: '#7289DA',
                    imageBackground: null,
                    dmEnabled: false,
                    dmMessage: 'Welcome to {server}! We hope you enjoy your stay.',
                    roleIds: []
                };
            }
            return welcome[guildId];
        },
        updateSettings: (guildId, settings) => {
            if (!welcome[guildId]) {
                welcome[guildId] = {
                    enabled: false,
                    channelId: null,
                    message: 'Welcome {user} to {server}! You are member #{count}.',
                    useImage: false,
                    color: '#7289DA',
                    imageBackground: null,
                    dmEnabled: false,
                    dmMessage: 'Welcome to {server}! We hope you enjoy your stay.',
                    roleIds: []
                };
            }
            
            // Update only the provided settings
            welcome[guildId] = {
                ...welcome[guildId],
                ...settings
            };
            
            saveData(WELCOME_FILE, welcome);
            return welcome[guildId];
        },
        setEnabled: (guildId, enabled) => {
            const settings = module.exports.welcome.getSettings(guildId);
            settings.enabled = enabled;
            saveData(WELCOME_FILE, welcome);
            return settings;
        },
        setChannel: (guildId, channelId) => {
            const settings = module.exports.welcome.getSettings(guildId);
            settings.channelId = channelId;
            saveData(WELCOME_FILE, welcome);
            return settings;
        },
        setMessage: (guildId, message) => {
            const settings = module.exports.welcome.getSettings(guildId);
            settings.message = message;
            saveData(WELCOME_FILE, welcome);
            return settings;
        },
        setDmEnabled: (guildId, enabled) => {
            const settings = module.exports.welcome.getSettings(guildId);
            settings.dmEnabled = enabled;
            saveData(WELCOME_FILE, welcome);
            return settings;
        },
        setDmMessage: (guildId, message) => {
            const settings = module.exports.welcome.getSettings(guildId);
            settings.dmMessage = message;
            saveData(WELCOME_FILE, welcome);
            return settings;
        },
        addRole: (guildId, roleId) => {
            const settings = module.exports.welcome.getSettings(guildId);
            if (!settings.roleIds.includes(roleId)) {
                settings.roleIds.push(roleId);
                saveData(WELCOME_FILE, welcome);
            }
            return settings;
        },
        removeRole: (guildId, roleId) => {
            const settings = module.exports.welcome.getSettings(guildId);
            settings.roleIds = settings.roleIds.filter(id => id !== roleId);
            saveData(WELCOME_FILE, welcome);
            return settings;
        }
    },
    settings: {
        get: () => settingsData,
        save: () => saveData(SETTINGS_FILE, settingsData),
        
        getGuildSettings: (guildId) => {
            if (!settingsData.guilds[guildId]) {
                settingsData.guilds[guildId] = {
                    language: 'en',
                    prefix: '!',
                    customCommands: {},
                    disabledCommands: [],
                    automod: {
                        enabled: false,
                        filters: {
                            invites: false,
                            links: false,
                            caps: false,
                            spam: false
                        }
                    }
                };
            }
            return settingsData.guilds[guildId];
        },
        
        setLanguage: (guildId, language) => {
            const settings = module.exports.settings.getGuildSettings(guildId);
            settings.language = language;
            saveData(SETTINGS_FILE, settingsData);
            return settings;
        },
        
        getLanguage: (guildId) => {
            const settings = module.exports.settings.getGuildSettings(guildId);
            return settings.language || 'en';
        }
    }
};