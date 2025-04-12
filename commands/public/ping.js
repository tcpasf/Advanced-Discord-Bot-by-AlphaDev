const { SlashCommandBuilder } = require('discord.js');
const { createInfoEmbed } = require('../../utils/embeds');
const { translate } = require('../../utils/translations');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and API response time'),
    
    async execute(interaction, t) {
        const sent = await interaction.deferReply({ fetchReply: true });
        
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        let latencyRating, apiLatencyRating;
        
        if (latency < 100) {
            latencyRating = `🟢 ${t.get('ping.excellent')}`;
        } else if (latency < 200) {
            latencyRating = `🟢 ${t.get('ping.good')}`;
        } else if (latency < 400) {
            latencyRating = `🟡 ${t.get('ping.average')}`;
        } else if (latency < 600) {
            latencyRating = `🟠 ${t.get('ping.poor')}`;
        } else {
            latencyRating = `🔴 ${t.get('ping.bad')}`;
        }
        
        if (apiLatency < 100) {
            apiLatencyRating = `🟢 ${t.get('ping.excellent')}`;
        } else if (apiLatency < 200) {
            apiLatencyRating = `🟢 ${t.get('ping.good')}`;
        } else if (apiLatency < 400) {
            apiLatencyRating = `🟡 ${t.get('ping.average')}`;
        } else if (apiLatency < 600) {
            apiLatencyRating = `🟠 ${t.get('ping.poor')}`;
        } else {
            apiLatencyRating = `🔴 ${t.get('ping.bad')}`;
        }
        
        const embed = createInfoEmbed(
            `🏓 ${t.get('ping.title')}`,
            t.get('ping.description')
        )
        .addFields(
            { name: t.get('ping.bot_latency'), value: `${latency}ms (${latencyRating})`, inline: true },
            { name: t.get('ping.api_latency'), value: `${apiLatency}ms (${apiLatencyRating})`, inline: true },
            { name: t.get('ping.uptime'), value: formatUptime(interaction.client.uptime, t), inline: true }
        );
        
        await interaction.editReply({ embeds: [embed] });
    }
};

function formatUptime(uptime, t) {
    const totalSeconds = Math.floor(uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}${t.get('ping.time.days_short')}`);
    if (hours > 0) parts.push(`${hours}${t.get('ping.time.hours_short')}`);
    if (minutes > 0) parts.push(`${minutes}${t.get('ping.time.minutes_short')}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}${t.get('ping.time.seconds_short')}`);
    
    return parts.join(' ');
}

function formatUptime(uptime) {
    const totalSeconds = Math.floor(uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
}