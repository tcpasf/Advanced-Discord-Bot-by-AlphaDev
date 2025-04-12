# Advanced Discord Bot by AlphaDev

![Discord Bot](https://i.imgur.com/XYZ123.png)

## Overview
This Discord bot is a comprehensive solution for server management, moderation, entertainment, and user engagement. Developed by AlphaDev, this bot includes a wide range of features to enhance your Discord server experience.

## Features

### Dashboard
- **Web Dashboard** - Control and configure the bot through a user-friendly web interface
- **Server Management** - Manage multiple servers from one dashboard
- **Real-time Statistics** - View server growth and command usage statistics
- **Feature Configuration** - Configure all bot features without using commands
- **User Management** - Manage users, warnings, and bans directly from the dashboard
- **Mobile Responsive** - Access the dashboard from any device

### Public Commands
- **banner** - Create custom user banners with profile information
- **invite** - Generate an invite link for the bot
- **server** - Display detailed server information
- **user** - Show comprehensive user profile details
- **ping** - Check bot latency and performance
- **rank** - Display user ranks with customized graphics
- **vip** - Information about VIP membership and benefits
- **help** - Interactive command menu with categories
- **setlanguage** - Change the bot language (ar/en/fr)

### Admin Commands
- **lock/unlock** - Control access to text channels
- **mute/unmute** - Manage user permissions in text channels
- **kick/ban/unban** - Essential moderation tools
- **unbanall** - Mass unban all users
- **vc-mute/vc-kick** - Voice channel moderation
- **warn/warnings** - User warning system
- **timeout/untimeout** - Temporary restrictions
- **text-mute** - Advanced mute management
- **set-nickname** - Change user nicknames
- **role-give/role-remove** - Role management with mass options
- **move/move-all** - Voice channel member management

### Ticket System
- **ticket setup** - Configure ticket system with categories and logs
- **ticket-close** - Close tickets with reason and transcript
- **ticket-rename** - Customize ticket channel names
- **ticket-add** - Add users to existing tickets
- **ticket-remove** - Remove users from tickets
- **ticket-blacklist** - Prevent users from creating tickets

### Games
- **tictactoe** - Play Tic Tac Toe against other users
- **hangman** - Classic word guessing game with categories
- **rps** - Rock Paper Scissors with PvP and PvE modes
- **connect4** - Strategic four-in-a-row game
- **blackjack** - Card game with betting mechanics
- **minesweeper** - Grid-based puzzle game with multiple difficulties

### Welcome System
- **welcome-setup** - Configure welcome messages with images
- **welcome-toggle** - Enable/disable the welcome system
- **welcome-test** - Test welcome messages and images
- **welcome-roles** - Manage automatic roles for new members
- **welcome-message** - Customize welcome messages and DMs

### Giveaway System
- **giveaway-start** - Create customizable giveaways
- **giveaway-end** - End giveaways early
- **giveaway-reroll** - Select new winners
- **giveaway-list** - View active and ended giveaways
- **giveaway-delete** - Remove giveaways

### Economy System
- **daily/weekly** - Claim regular currency rewards
- **work** - Earn currency through virtual work
- **balance** - Check your current balance
- **shop** - Browse and purchase items
- **inventory** - View your purchased items
- **transfer** - Send currency to other users
- **leaderboard** - View top users by currency

## Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with your bot token and application ID:
   ```
   TOKEN=your_discord_bot_token_here
   CLIENT_ID=your_discord_application_id_here
   GUILD_ID=optional_test_guild_id_here
   
   # API Server Configuration
   API_PORT=3000
   
   # Discord OAuth2 Configuration
   DISCORD_CLIENT_ID=your_discord_application_id_here
   DISCORD_CLIENT_SECRET=your_discord_application_client_secret_here
   DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback
   ```
4. Deploy commands:
   ```
   npm run deploy
   ```
5. Start the bot:
   ```
   npm start
   ```
6. Set up Discord OAuth2 for the dashboard:
   - Go to the [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your application
   - Go to the OAuth2 section
   - Add a redirect URL: `http://localhost:3000/dashboard-callback.html`
   - Save changes

7. Access the dashboard at:
   ```
   http://localhost:3000/dashboard.html
   ```

## Required Dependencies
- discord.js v14
- canvas
- dotenv
- ms
- node-fetch
- axios
- express
- cors
- body-parser

## Required Permissions
The bot requires Administrator permissions or the following individual permissions:
- Manage Channels
- Manage Roles
- Kick Members
- Ban Members
- Manage Messages
- Embed Links
- Attach Files
- Read Message History
- Use External Emojis
- Add Reactions
- Connect
- Speak
- Mute Members
- Move Members

## Multi-Language Support
The bot supports multiple languages:
- English (en)
- Arabic (ar)
- French (fr)

Use the `/setlanguage` command to change the bot's language for your server.

## Credits
This Discord bot was developed by AlphaDev. All rights reserved.

© 2024 AlphaDev. This software is provided for personal and educational use only. Commercial use requires explicit permission from the author.

## Support
For support, feature requests, or bug reports, please contact AlphaDev through Discord.

---

**Note:** This bot is designed to be highly customizable. Feel free to modify the code to suit your specific server needs while respecting the original attribution.