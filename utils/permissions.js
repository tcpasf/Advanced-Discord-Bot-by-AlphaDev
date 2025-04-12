const { PermissionFlagsBits } = require('discord.js');

const ADMIN_PERMISSIONS = [
    PermissionFlagsBits.Administrator
];

const MODERATION_PERMISSIONS = [
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ModerateMembers
];

function hasAdminPermissions(member) {
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

function hasModPermissions(member) {
    return MODERATION_PERMISSIONS.some(perm => member.permissions.has(perm)) || hasAdminPermissions(member);
}

function checkPermissions(interaction, requiredPermissions) {
    const member = interaction.member;
    
    if (!member) {
        return false;
    }
    
    if (hasAdminPermissions(member)) {
        return true;
    }
    
    return requiredPermissions.every(permission => member.permissions.has(permission));
}

module.exports = {
    ADMIN_PERMISSIONS,
    MODERATION_PERMISSIONS,
    hasAdminPermissions,
    hasModPermissions,
    checkPermissions
};