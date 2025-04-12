const { SlashCommandBuilder } = require('discord.js');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('View user or server avatar')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View user avatar')
                .addUserOption(option => 
                    option.setName('user')
                        .setDescription('The user whose avatar to view')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('server')
                .setDescription('View server icon')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'view') {
            const user = interaction.options.getUser('user') || interaction.user;
            const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 4096 });
            
            const embed = {
                title: `${user.username}'s Avatar`,
                image: { url: avatarUrl },
                color: 0x3498db,
                footer: { text: `Requested by ${interaction.user.tag}` },
                timestamp: new Date()
            };
            
            const row = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 2,
                        label: 'PNG',
                        custom_id: `avatar_png_${user.id}`,
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'JPG',
                        custom_id: `avatar_jpg_${user.id}`,
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'WebP',
                        custom_id: `avatar_webp_${user.id}`,
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'GIF',
                        custom_id: `avatar_gif_${user.id}`,
                        disabled: !user.avatar?.startsWith('a_'),
                    }
                ]
            };
            
            return interaction.reply({ embeds: [embed], components: [row] });
        } else if (subcommand === 'server') {
            const guild = interaction.guild;
            
            if (!guild.icon) {
                return interaction.reply({ content: 'This server does not have an icon.', ephemeral: true });
            }
            
            const iconUrl = guild.iconURL({ dynamic: true, size: 4096 });
            
            const embed = {
                title: `${guild.name}'s Icon`,
                image: { url: iconUrl },
                color: 0x3498db,
                footer: { text: `Requested by ${interaction.user.tag}` },
                timestamp: new Date()
            };
            
            const row = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 2,
                        label: 'PNG',
                        custom_id: `server_png_${guild.id}`,
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'JPG',
                        custom_id: `server_jpg_${guild.id}`,
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'WebP',
                        custom_id: `server_webp_${guild.id}`,
                    },
                    {
                        type: 2,
                        style: 2,
                        label: 'GIF',
                        custom_id: `server_gif_${guild.id}`,
                        disabled: !guild.icon.startsWith('a_'),
                    }
                ]
            };
            
            return interaction.reply({ embeds: [embed], components: [row] });
        }
    },
    
    async handleButton(interaction) {
        const [type, format, id] = interaction.customId.split('_');
        
        if (type === 'avatar') {
            const user = await interaction.client.users.fetch(id);
            
            if (!user) {
                return interaction.reply({ content: 'User not found.', ephemeral: true });
            }
            
            const avatarURL = user.displayAvatarURL({ 
                extension: format, 
                size: 4096,
                forceStatic: format !== 'gif'
            });
            
            await interaction.reply({
                content: `${user.username}'s avatar in ${format.toUpperCase()} format: ${avatarURL}`,
                ephemeral: true
            });
        } else if (type === 'server') {
            const guild = interaction.client.guilds.cache.get(id);
            
            if (!guild) {
                return interaction.reply({ content: 'Server not found.', ephemeral: true });
            }
            
            const iconURL = guild.iconURL({ 
                extension: format, 
                size: 4096,
                forceStatic: format !== 'gif'
            });
            
            await interaction.reply({
                content: `${guild.name}'s icon in ${format.toUpperCase()} format: ${iconURL}`,
                ephemeral: true
            });
        }
    }
};