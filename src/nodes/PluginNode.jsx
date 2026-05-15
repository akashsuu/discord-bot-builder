import React, { useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';

// -- Demo variable substitution -------------------------------------------------
// Replaces every {token} with a realistic preview value.
// Accepts `extra` for page-specific tokens ({page}, {totalPages}).
function pluginPreview(template, data, extra) {
 const d = data || {};
 const e = extra || {};
 return (template || '')
 // Sender
 .replace(/\{user\}/g, 'Akashsuu')
 .replace(/\{tag\}/g, 'Akashsuu#0000')
 .replace(/\{id\}/g, '123456789012345678')
 .replace(/\{mention\}/g, '@Akashsuu')
 // Target
 .replace(/\{target\}/g, 'OwO#8456')
 .replace(/\{targetName\}/g, 'OwO')
 .replace(/\{targetId\}/g, '987654321098765432')
 .replace(/\{targetMention\}/g, '@OwO')
 // Command / args
 .replace(/\{command\}/g, d.command || '!command')
 .replace(/\{args\}/g, 'hello world')
 .replace(/\{reason\}/g, d.reason || 'No reason provided')
 // Server / channel
 .replace(/\{server\}/g, 'My Server')
 .replace(/\{channel\}/g, 'general')
 .replace(/\{memberCount\}/g, '1,234')
 // Page-specific (updated per page)
 .replace(/\{page\}/g, e.page ?? '1')
 .replace(/\{totalPages\}/g, e.totalPages ?? '1')
 .replace(/\{selected\}/g, e.selected ?? '')
 .replace(/\{button\}/g, e.button ?? '')
 // Utility
 .replace(/\{latency\}/g, '42')
 .replace(/\{date\}/g, '2026-05-05')
 .replace(/\{time\}/g, '12:00:00');
}

// -- Keys hidden from plain-input renderer --------------------------------------
const EMBED_KEYS = new Set([
 'embedEnabled', 'embedColor', 'embedTitle', 'embedFooter', 'embedTimestamp',
 'logoUrl', 'logoName', 'imageUrl', 'imagePosition',
 'embedDescription', 'embedThumbnail', 'embedImage',
 'dmEnabled', 'dmMessage',
 'pages', 'dropdown', 'buttons',
 // serverinfo template sections
 'ownerTemplate', 'serverIdTemplate', 'createdTemplate', 'membersTemplate',
 'channelsTemplate', 'rolesTemplate', 'boostTemplate', 'verificationTemplate',
]);

const TICKET_PANEL_KEYS = new Set([
 'panelMode', 'categories', 'categoryLabels', 'buttonStyle', 'dropdownPlaceholder',
]);

const TICKET_STATUS_KEYS = new Set([
 'lockMessage', 'unlockMessage', 'supportRoles', 'logChannel',
]);

const AFK_KEYS = new Set([
 'defaultReason', 'setMessage', 'mentionMessage', 'returnMessage',
]);

const AVATAR_KEYS = new Set([
 'aliases', 'titleTemplate', 'serverTitleTemplate', 'descriptionTemplate',
 'noAvatarMessage', 'downloadButtonLabel', 'openButtonLabel', 'serverButtonLabel',
 'showDownloadButton', 'showOpenButton', 'showServerButton',
]);

const SETBOOST_KEYS = new Set([
 'boostChannelId', 'enabledByDefault', 'panelTitle', 'panelDescription',
 'boostMessage', 'testMessage', 'enableButtonLabel', 'disableButtonLabel',
 'testButtonLabel', 'resetButtonLabel',
]);

const BOOSTCOUNT_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
]);

const CHANNELINFO_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate', 'notFoundMessage',
]);

const EMBEDBUILDER_KEYS = new Set([
 'aliases', 'panelButtonLabel',
 'defaultAuthorText', 'defaultAuthorIcon', 'defaultTitle', 'defaultDescription',
 'defaultThumbnail', 'defaultImage', 'defaultFooterText', 'defaultFooterIcon', 'defaultColor',
 'sentMessage', 'abortedMessage',
 'authorTextButtonLabel', 'authorIconButtonLabel', 'titleButtonLabel',
 'descriptionButtonLabel', 'thumbnailButtonLabel', 'imageButtonLabel',
 'footerTextButtonLabel', 'footerIconButtonLabel', 'colorButtonLabel',
 'resetButtonLabel', 'sendButtonLabel', 'abortButtonLabel',
]);

const INVITE_KEYS = new Set([
 'aliases', 'customInviteUrl', 'clientId', 'permissions', 'scopes',
 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
 'inviteButtonLabel', 'supportButtonLabel', 'supportUrl', 'showSupportButton',
]);

const MEMBERCOUNT_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
]);

const SERVERICON_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate', 'noIconMessage',
 'downloadButtonLabel', 'openButtonLabel', 'showDownloadButton', 'showOpenButton',
]);

const STATS_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
]);

const STEAL_KEYS = new Set([
 'aliases', 'defaultName', 'successMessage', 'notFoundMessage', 'permissionMessage',
 'errorMessage', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
]);

const USERINFO_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate', 'notFoundMessage',
]);

const PREFIX_KEYS = new Set([
 'aliases', 'requireManageGuild', 'titleTemplate', 'descriptionTemplate',
 'plainTextTemplate', 'currentMessage', 'permissionMessage', 'invalidMessage',
]);

const CALCULATOR_KEYS = new Set([
 'aliases', 'titleTemplate', 'expressionLabel', 'resultLabel', 'statusLabel',
 'readyText', 'errorText', 'footerTemplate', 'onlyUserMessage', 'timeoutMessage',
]);

const PLAYING_KEYS = new Set([
 'command', 'aliases', 'activityName', 'activityType', 'producerName', 'status', 'imageUrl',
 'animatedAvatarUrl', 'animatedBannerUrl', 'useAnimatedAvatar', 'useAnimatedBanner',
 'requireManageGuild',
 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate', 'currentMessage',
 'permissionMessage', 'clearedMessage',
]);

const BOTINFO_KEYS = new Set([
 'aliases', 'ownerId', 'ownerName', 'manualCommandCount', 'bannerUrl', 'inviteUrl', 'supportUrl',
 'titleTemplate', 'descriptionTemplate', 'footerTemplate', 'notBotMessage',
 'profileLinkLabel', 'supportLinkLabel',
]);

const WELCOME_KEYS = new Set([
 'aliases', 'channelId', 'requireManageGuild', 'mentionUser', 'deleteAfterSeconds',
 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate', 'footerTemplate',
 'authorName', 'authorIconUrl', 'thumbnailUrl', 'imageUrl', 'buttonLabel', 'buttonUrl',
 'testModeMessage', 'permissionMessage', 'missingChannelMessage', 'errorMessage',
]);

const RESTART_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
 'successMessage', 'permissionMessage', 'unavailableMessage', 'errorMessage', 'delayMs',
]);

const SHUTDOWN_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
 'permissionMessage', 'unavailableMessage', 'errorMessage', 'delayMs',
]);

const NUKE_KEYS = new Set([
 'confirmationRequired', 'confirmationKeyword', 'reason', 'successMessage',
 'confirmMessage', 'permissionMessage', 'unsupportedMessage', 'errorMessage',
]);

const VOICEKICK_KEYS = new Set([
 'aliases', 'reason', 'successMessage', 'usageMessage', 'permissionMessage',
 'botPermissionMessage', 'notInVoiceMessage', 'selfMessage', 'errorMessage',
]);

const VOICEBAN_KEYS = new Set([
 'aliases', 'reason', 'disconnectAfterBan', 'successMessage', 'usageMessage',
 'permissionMessage', 'botPermissionMessage', 'movePermissionMessage',
 'notInVoiceMessage', 'selfMessage', 'errorMessage',
]);

const VOICEUNBAN_KEYS = new Set([
 'aliases', 'channelId', 'reason', 'successMessage', 'usageMessage',
 'permissionMessage', 'botPermissionMessage', 'channelMessage',
 'selfMessage', 'errorMessage',
]);

const VOICEMUTE_KEYS = new Set([
 'aliases', 'reason', 'successMessage', 'usageMessage', 'permissionMessage',
 'botPermissionMessage', 'notInVoiceMessage', 'alreadyMutedMessage',
 'selfMessage', 'errorMessage',
]);

const VOICEUNMUTE_KEYS = new Set([
 'aliases', 'reason', 'successMessage', 'usageMessage', 'permissionMessage',
 'botPermissionMessage', 'notInVoiceMessage', 'notMutedMessage',
 'selfMessage', 'errorMessage',
]);

const VMOVEALL_KEYS = new Set([
 'aliases', 'sourceChannelId', 'targetChannelId', 'reason', 'successMessage',
 'usageMessage', 'permissionMessage', 'botPermissionMessage', 'sourceMessage',
 'targetMessage', 'emptyMessage', 'sameChannelMessage', 'partialMessage',
 'errorMessage',
]);

const ANTINUKE_KEYS = new Set([
 'aliases', 'enabledByDefault', 'punishment', 'deleteTriggerMessage', 'autoRecovery',
 'logChannelId', 'whitelistUserIds', 'whitelistRoleIds', 'tickText', 'crossText',
 'panelTitle', 'panelDescription', 'statusLine', 'featuresTitle', 'featuresFooter',
 'enabledText', 'disabledText', 'enableButtonLabel', 'disableButtonLabel',
 'featuresButtonLabel', 'backButtonLabel', 'enabledMessage', 'disabledMessage',
 'permissionMessage', 'botPermissionMessage', 'blockedMessage', 'errorMessage',
 'antiBan', 'antiUnban', 'antiKick', 'antiBotAdd', 'antiChannelCreate',
 'antiChannelDelete', 'antiChannelUpdate', 'antiRoleCreate', 'antiRoleDelete',
 'antiRoleUpdate', 'antiMemberUpdate', 'antiEmojiStickerCreate',
 'antiEmojiStickerDelete', 'antiEmojiStickerUpdate', 'antiEveryoneHerePing',
 'antiRolePing', 'antiIntegration', 'antiGuildUpdate', 'antiWebhookCreate',
 'antiWebhookDelete', 'antiWebhookUpdate', 'antiLinkRole', 'antiInviteRole',
]);

const MUSIC_PLAY_KEYS = new Set([
 'aliases', 'lavalinkUrl', 'lavalinkHost', 'lavalinkPort', 'lavalinkPassword', 'lavalinkSecure',
 'youtubeSearchPrefix', 'fallbackSearchPrefixes', 'volume', 'nowPlayingTitle', 'artistTemplate',
 'durationTemplate', 'queuedMessage', 'missingQueryMessage', 'missingVoiceMessage',
 'noResultsMessage', 'lavalinkErrorMessage', 'completedMessage',
 'shuffleButtonLabel', 'previousButtonLabel', 'pauseButtonLabel', 'resumeButtonLabel', 'skipButtonLabel',
 'queueButtonLabel', 'autoplayButtonLabel', 'restartButtonLabel', 'disconnectButtonLabel',
 'playlistsButtonLabel', 'browseButtonLabel', 'settingsButtonLabel',
]);

const GIVEAWAY_CREATE_KEYS = new Set([
 'aliases', 'panelTitle', 'setupMessage', 'prize', 'duration', 'winnerCount', 'channelId',
 'enterEmoji', 'enterButtonLabel', 'durationButtons', 'winnerLabel', 'footerTemplate',
 'prizeButtonLabel', 'winnersButtonLabel', 'customDurationButtonLabel',
 'sendButtonLabel', 'abortButtonLabel', 'channelSelectPlaceholder',
 'hostedByTemplate', 'endedTitle', 'endedDescription', 'noEntriesText',
 'permissionMessage', 'sentMessage', 'abortedMessage',
]);

const GIVEAWAY_STOP_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate', 'plainTextTemplate',
 'noneMessage', 'permissionMessage', 'errorMessage',
]);

const MINECRAFT_PROFILE_KEYS = new Set([
 'aliases', 'defaultEdition', 'titleTemplate', 'descriptionTemplate',
 'notFoundMessage', 'errorMessage', 'skinLinkLabel',
]);

const ROBLOX_PROFILE_KEYS = new Set([
 'aliases', 'titleTemplate', 'descriptionTemplate',
 'notFoundMessage', 'errorMessage', 'profileLinkLabel',
]);

const FORTNITE_PROFILE_KEYS = new Set([
 'aliases', 'apiKey', 'accountType', 'timeWindow', 'titleTemplate', 'descriptionTemplate',
 'missingKeyMessage', 'notFoundMessage', 'errorMessage', 'profileLinkLabel',
]);

const VALORANT_PROFILE_KEYS = new Set([
 'aliases', 'apiKey', 'region', 'platform', 'titleTemplate', 'descriptionTemplate',
 'missingKeyMessage', 'invalidNameMessage', 'notFoundMessage', 'errorMessage', 'profileLinkLabel',
]);

const COUNTER_STRIKE_PROFILE_KEYS = new Set([
 'aliases', 'apiKey', 'appId', 'titleTemplate', 'descriptionTemplate',
 'missingKeyMessage', 'invalidSteamIdMessage', 'notFoundMessage', 'errorMessage', 'profileLinkLabel',
]);

const PUBG_PROFILE_KEYS = new Set([
 'aliases', 'apiKey', 'platform', 'gameMode', 'titleTemplate', 'descriptionTemplate',
 'missingKeyMessage', 'notFoundMessage', 'errorMessage', 'profileLinkLabel',
]);

const GENSHIN_PROFILE_KEYS = new Set([
 'aliases', 'apiBase', 'userAgent', 'nameMap', 'titleTemplate', 'descriptionTemplate',
 'invalidUidMessage', 'nameNotMappedMessage', 'notFoundMessage', 'rateLimitMessage', 'errorMessage', 'profileLinkLabel',
]);

const PHASMOPHOBIA_PROFILE_KEYS = new Set([
 'aliases', 'apiKey', 'appId', 'statMap', 'titleTemplate', 'descriptionTemplate',
 'invalidSteamIdMessage', 'notFoundMessage', 'errorMessage', 'profileLinkLabel',
]);

const STEAM_PROFILE_KEYS = new Set([
 'aliases', 'apiKey', 'titleTemplate', 'descriptionTemplate',
 'invalidSteamIdMessage', 'notFoundMessage', 'errorMessage', 'profileLinkLabel',
]);

const EPICGAMES_PROFILE_KEYS = new Set([
 'aliases', 'lookupUrlTemplate', 'apiKey', 'apiKeyHeader', 'profileMap',
 'titleTemplate', 'descriptionTemplate', 'notFoundMessage', 'errorMessage', 'profileLinkLabel',
]);

const PLUGIN_HEADER_PURPLE = '#7c3aed';

function splitCsv(value) {
 return String(value || '')
 .split(',')
 .map((part) => part.trim())
 .filter(Boolean);
}

function splitCsvLoose(value) {
 return String(value || '')
 .split(',')
 .map((part) => part.trim());
}

function titleCase(value) {
 const clean = String(value || '').replace(/[-_]+/g, ' ').trim();
 return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Support';
}

function getTicketPanelOptions(data) {
 const categories = data.categories == null ? ['support'] : splitCsvLoose(data.categories);
 const labels = splitCsvLoose(data.categoryLabels || '');
 const length = Math.max(categories.length, labels.length, 1);
 return Array.from({ length }, (_, index) => {
 const category = categories[index] ?? (index === 0 && labels.length === 0 ? 'support' : '');
 return {
 category,
 label: labels[index] ?? titleCase(category),
 };
 }).filter((option, index, list) =>
 list.length === 1 || option.category !== '' || option.label !== ''
 );
}

// -- Small section heading ------------------------------------------------------
function SectionHead({ color = '#888', children }) {
 return (
 <div style={{ color, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 0 3px', userSelect: 'none' }}>
 {children}
 </div>
 );
}

// -- Inline Discord message preview --------------------------------------------
function DiscordPreviewInline({ pages, pageIdx, data }) {
 const pgs = Array.isArray(pages) ? pages : [];
 const page = pgs[pageIdx] || pgs[0] || { title: '', content: '' };
 const extra = { page: String(pageIdx + 1), totalPages: String(pgs.length) };
 const color = data.embedColor || '#5865F2';

 const title = pluginPreview(page.title || '', data, extra);
 const content = pluginPreview(page.content || '', data, extra);
 const footer = data.embedFooter
 ? pluginPreview(data.embedFooter, data, extra)
 : null;

 return (
 <div style={{ background: '#36393F', borderRadius: 5, padding: '7px 8px', fontSize: 11 }}>
 {/* Bot header */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
 <div style={{
 width: 26, height: 26, borderRadius: '50%',
 background: color, display: 'flex', alignItems: 'center',
 justifyContent: 'center', fontSize: 13, flexShrink: 0,
 }}></div>
 <span style={{ color: '#FFF', fontWeight: 700, fontSize: 12 }}>YourBot</span>
 <span style={{
 background: '#5865F2', color: '#FFF', fontSize: 9,
 padding: '1px 4px', borderRadius: 3, fontWeight: 700,
 }}>BOT</span>
 <span style={{ color: '#72767D', fontSize: 10, marginLeft: 'auto' }}>Today at 12:00</span>
 </div>

 {/* Message body */}
 {data.embedEnabled !== false ? (
 /* Embed */
 <div style={{
 borderLeft: `4px solid ${color}`,
 background: '#2F3136',
 borderRadius: '0 4px 4px 0',
 padding: '8px 10px',
 }}>
 {title && (
 <div style={{ color: '#FFF', fontWeight: 700, fontSize: 12, marginBottom: 3, lineHeight: 1.3 }}>
 {title}
 </div>
 )}
 {content && (
 <div style={{ color: '#DCDDDE', fontSize: 11, whiteSpace: 'pre-wrap', lineHeight: 1.5, wordBreak: 'break-word' }}>
 {content}
 </div>
 )}
 {footer && (
 <div style={{
 color: '#72767D', fontSize: 10, marginTop: 6,
 borderTop: '1px solid #40444B', paddingTop: 4,
 }}>
 {footer}
 </div>
 )}
 </div>
 ) : (
 /* Plain text */
 <div style={{ color: '#DCDDDE', fontSize: 11, whiteSpace: 'pre-wrap', lineHeight: 1.5, wordBreak: 'break-word' }}>
 {content || <span style={{ color: '#555' }}>(empty page)</span>}
 </div>
 )}
 </div>
 );
}

// -- Server Info inline Discord preview ---------------------------------------
const SI_DEMO = {
 server: 'My Server', serverId: '123456789012345678',
 memberCount: '1,234', humanCount: '1,200', botCount: '34',
 owner: 'ServerOwner', ownerMention: '@ServerOwner', ownerId: '987654321098765432',
 boostTier: 'No Level', boostBar: 'No boosts yet', boostCount: '0',
 roles: '25', textChannels: '13', voiceChannels: '4', categories: '6',
 verification: 'Lock Low',
 createdAt: 'January 1, 2023',
 createdTimestamp: 'January 1, 2023 (2 years ago)',
 user: 'Akashsuu', command: 'serverinfo',
 date: '2026-05-06', time: '12:00:00',
};

function siApply(template, extra = {}) {
 const vars = { ...SI_DEMO, ...extra };
 return String(template || '').replace(/\{(\w+)\}/g, (m, k) =>
 Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m
 );
}

function DiscordPreviewServerInfo({ data }) {
 const color = data.embedColor || '#5865F2';

 const sections = [
 data.ownerTemplate || 'Owner Owner\n{ownerMention} ({owner})',
 data.serverIdTemplate || 'ID Server ID\n{serverId}',
 data.createdTemplate || 'Created Created\n{createdAt} ({createdTimestamp})',
 data.membersTemplate || 'Members Members\n{memberCount} total\nHuman Humans: {humanCount}\nBot Bots: {botCount}',
 data.channelsTemplate || 'Channels Channels\nChannels Text: {textChannels}\nVoice Voice: {voiceChannels}\n Categories: {categories}',
 data.rolesTemplate || 'Roles Roles\n{roles} roles',
 data.boostTemplate || 'Boost Boost - {boostTier}\n{boostBar}\n{boostCount} boosts',
 data.verificationTemplate || 'Lock Verification\n{verification}',
 ].map((t) => siApply(t)).join('\n\n');

 const title = siApply(data.embedTitle || ' {server}');
 const footer = siApply(data.embedFooter || 'Server ID: {serverId}');

 return (
 <div style={{ background: '#36393F', borderRadius: 5, padding: '7px 8px', fontSize: 11, marginTop: 6 }}>
 {/* Bot row */}
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
 <div style={{ width: 26, height: 26, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}></div>
 <span style={{ color: '#FFF', fontWeight: 700, fontSize: 12 }}>YourBot</span>
 <span style={{ background: '#5865F2', color: '#FFF', fontSize: 9, padding: '1px 4px', borderRadius: 3, fontWeight: 700 }}>BOT</span>
 <span style={{ color: '#72767D', fontSize: 10, marginLeft: 'auto' }}>Today at 12:00</span>
 </div>
 {/* Embed */}
 <div style={{ borderLeft: `4px solid ${color}`, background: '#2F3136', borderRadius: '0 4px 4px 0', padding: '8px 10px' }}>
 <div style={{ color: '#FFF', fontWeight: 700, fontSize: 12, marginBottom: 5 }}>{title}</div>
 <div style={{ color: '#DCDDDE', fontSize: 10, whiteSpace: 'pre-wrap', lineHeight: 1.6, wordBreak: 'break-word' }}>{sections}</div>
 <div style={{ color: '#72767D', fontSize: 10, marginTop: 6, borderTop: '1px solid #40444B', paddingTop: 4 }}>{footer}</div>
 </div>
 </div>
 );
}

export default function PluginNode({ id, type, data, selected }) {
 const { setNodes } = useReactFlow();
 const collapsed = !!data.collapsed;
 const [previewPg, setPreviewPg] = useState(0);

 // -- Top-level updater -----------------------------------------------------
 const update = useCallback((key, val) => {
 setNodes((ns) => ns.map((n) =>
 n.id === id ? { ...n, data: { ...n.data, [key]: val } } : n
 ));
 }, [id, setNodes]);

 const updateMany = useCallback((patch) => {
 setNodes((ns) => ns.map((n) =>
 n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
 ));
 }, [id, setNodes]);

 const toggle = useCallback(() => {
 setNodes((ns) => ns.map((n) =>
 n.id === id ? { ...n, data: { ...n.data, collapsed: !n.data.collapsed } } : n
 ));
 }, [id, setNodes]);

 // -- Dropdown updater ------------------------------------------------------
 const updateDropdown = useCallback((key, val) => {
 setNodes((ns) => ns.map((n) => {
 if (n.id !== id) return n;
 const dd = { enabled: false, placeholder: '', usePages: true, ...(n.data.dropdown || {}), [key]: val };
 return { ...n, data: { ...n.data, dropdown: dd } };
 }));
 }, [id, setNodes]);

 // -- Buttons updater -------------------------------------------------------
 const updateButtons = useCallback((key, val) => {
 setNodes((ns) => ns.map((n) => {
 if (n.id !== id) return n;
 const bt = { enabled: false, navigation: true, list: [], ...(n.data.buttons || {}), [key]: val };
 return { ...n, data: { ...n.data, buttons: bt } };
 }));
 }, [id, setNodes]);

 // -- Pages: single immutable updater -------------------------------------
 const updatePages = useCallback((pages) => {
 update('pages', pages);
 }, [update]);

 // -- Derived values --------------------------------------------------------
 const inputFields = Object.entries(data).filter(
 ([k]) => !k.startsWith('_') && k !== 'collapsed' && k !== 'output' && !EMBED_KEYS.has(k) && !TICKET_PANEL_KEYS.has(k) && !(TICKET_STATUS_KEYS.has(k) && ['ticket_lock', 'ticket_unlock'].includes(type)) && !(AFK_KEYS.has(k) && type === 'util_afk') && !(AVATAR_KEYS.has(k) && type === 'util_avatar') && !(SETBOOST_KEYS.has(k) && type === 'util_setboost') && !(BOOSTCOUNT_KEYS.has(k) && type === 'util_boostcount') && !(CHANNELINFO_KEYS.has(k) && type === 'util_channelinfo') && !(EMBEDBUILDER_KEYS.has(k) && type === 'util_embedbuilder') && !(INVITE_KEYS.has(k) && type === 'util_invite') && !(MEMBERCOUNT_KEYS.has(k) && type === 'util_membercount') && !(SERVERICON_KEYS.has(k) && type === 'util_servericon') && !(STATS_KEYS.has(k) && type === 'util_stats') && !(STEAL_KEYS.has(k) && type === 'util_steal') && !(USERINFO_KEYS.has(k) && type === 'util_userinfo') && !(PREFIX_KEYS.has(k) && type === 'util_prefix') && !(CALCULATOR_KEYS.has(k) && type === 'util_calculator') && !(PLAYING_KEYS.has(k) && type === 'info_playing') && !(BOTINFO_KEYS.has(k) && type === 'info_botinfo') && !(WELCOME_KEYS.has(k) && type === 'admin_welcome') && !(RESTART_KEYS.has(k) && type === 'admin_restart') && !(SHUTDOWN_KEYS.has(k) && type === 'admin_shutdown') && !(NUKE_KEYS.has(k) && type === 'moderation_nuke') && !(VOICEKICK_KEYS.has(k) && type === 'moderation_voicekick') && !(VOICEBAN_KEYS.has(k) && type === 'moderation_voiceban') && !(VOICEUNBAN_KEYS.has(k) && type === 'moderation_voiceunban') && !(VOICEMUTE_KEYS.has(k) && type === 'moderation_voicemute') && !(VOICEUNMUTE_KEYS.has(k) && type === 'moderation_voiceunmute') && !(VMOVEALL_KEYS.has(k) && type === 'moderation_vmoveall') && !(ANTINUKE_KEYS.has(k) && type === 'moderation_antinuke') && !(MUSIC_PLAY_KEYS.has(k) && type === 'music_play') && !(GIVEAWAY_CREATE_KEYS.has(k) && type === 'giveaway_create') && !(GIVEAWAY_STOP_KEYS.has(k) && type === 'giveaway_stop') && !(MINECRAFT_PROFILE_KEYS.has(k) && type === 'game_minecraft_profile') && !(ROBLOX_PROFILE_KEYS.has(k) && type === 'game_roblox_profile') && !(FORTNITE_PROFILE_KEYS.has(k) && type === 'game_fortnite_profile') && !(VALORANT_PROFILE_KEYS.has(k) && type === 'game_valorant_profile') && !(COUNTER_STRIKE_PROFILE_KEYS.has(k) && type === 'game_counter_strike_profile') && !(PUBG_PROFILE_KEYS.has(k) && type === 'game_pubg_profile') && !(GENSHIN_PROFILE_KEYS.has(k) && type === 'game_genshin_profile') && !(PHASMOPHOBIA_PROFILE_KEYS.has(k) && type === 'game_phasmophobia_profile') && !(STEAM_PROFILE_KEYS.has(k) && type === 'game_steam_profile') && !(EPICGAMES_PROFILE_KEYS.has(k) && type === 'game_epicgames_profile') && k !== 'pages' && k !== 'dropdown' && k !== 'buttons'
 );
 const commandFields = inputFields.filter(([key]) => key === 'command');
 const configFields = inputFields.filter(([key]) => key !== 'command');
 const hasOutput = 'output' in data;
 const previewText = hasOutput ? pluginPreview(data.output, data, {}) : null;

 // Show page editor if pages key exists OR if this is a known page-menu node type
 const PAGE_MENU_TYPES = new Set(['page_menu', 'util_pagemenu', 'util_helpmenu']);
 const isPageMenuType = PAGE_MENU_TYPES.has(type || '');
 const hasPages = 'pages' in data || isPageMenuType;
 const hasDropdown = 'dropdown' in data;
 const hasButtons = 'buttons' in data;

 // Auto-seed a blank pages array on first render if this is a page-menu type
 // but arrived without pages (e.g. old saved project before fix)
 React.useEffect(() => {
 if (isPageMenuType && !Array.isArray(data.pages)) {
 update('pages', [{ id: `page_1`, title: 'Page 1', content: 'Edit this text' }]);
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const dd = data.dropdown || {};
 const bt = data.buttons || {};
 const pgs = Array.isArray(data.pages) ? data.pages : [];
 const ticketOptions = getTicketPanelOptions(data);
 const isTicketStatusNode = type === 'ticket_lock' || type === 'ticket_unlock';
 const ticketStatusMessageKey = type === 'ticket_lock' ? 'lockMessage' : 'unlockMessage';
 const ticketStatusDefaultMessage = type === 'ticket_lock'
 ? ' **Ticket Locked** - The ticket owner can no longer send messages.'
 : 'Unlock **Ticket Unlocked** - The ticket owner can send messages again.';

 const saveTicketOptions = useCallback((options) => {
 const safe = options.length ? options : [{ category: 'support', label: 'Support' }];
 updateMany({
 categories: safe.map((option) => option.category ?? 'support').join(','),
 categoryLabels: safe.map((option) => option.label ?? titleCase(option.category)).join(','),
 });
 }, [updateMany]);

 const updateTicketOption = useCallback((index, patch) => {
 const next = ticketOptions.map((option, optionIndex) => (
 optionIndex === index ? { ...option, ...patch } : option
 ));
 saveTicketOptions(next);
 }, [ticketOptions, saveTicketOptions]);

 const addTicketOption = useCallback((event) => {
 event.preventDefault();
 event.stopPropagation();
 const nextIndex = ticketOptions.length + 1;
 saveTicketOptions([
 ...ticketOptions,
 { category: `support_${nextIndex}`, label: `Support ${nextIndex}` },
 ]);
 }, [ticketOptions, saveTicketOptions]);

 const removeTicketOption = useCallback((index, event) => {
 event.preventDefault();
 event.stopPropagation();
 saveTicketOptions(ticketOptions.filter((_, optionIndex) => optionIndex !== index));
 }, [ticketOptions, saveTicketOptions]);

 // Keep previewPg in bounds when pages shrink
 const safePg = Math.min(previewPg, Math.max(0, pgs.length - 1));

 return (
 <div
 className={`bl-node ${selected ? 'selected' : ''} ${collapsed ? 'bl-node-min' : ''}`}
 style={{ minWidth: 260 }}
 >
 {/* -- Header ------------------------------------------------------- */}
 <div className="bl-node-hdr" style={{ background: PLUGIN_HEADER_PURPLE }}>
 <button className="bl-collapse-btn" onClick={toggle} title={collapsed ? 'Expand' : 'Minimize'}>
 {collapsed ? '>' : 'v'}
 </button>
 <span className="bl-node-hdr-icon">{data._icon || ''}</span>
 <span className="bl-node-hdr-title">{data._label || 'Plugin Node'}</span>
 {collapsed && (
 <>
 {data._hasInput && <Handle type="target" position={Position.Left} id="input" className="handle-gray" />}
 {data._hasOutput && <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />}
 </>
 )}
 </div>

 {!collapsed && (
 <div className="bl-node-body nodrag nowheel">
 {/* -- Input socket ----------------------------------------------- */}
 {data._hasInput && (
 <div className="bl-row bl-row-in">
 <Handle type="target" position={Position.Left} id="input" className="handle-gray" />
 <span className="bl-socket-label">Message</span>
 </div>
 )}

 {/* -- Standard text inputs (e.g. command, reason) ---------------- */}
 {commandFields.length > 0 && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F59E0B">Prefix Command</SectionHead>
 {commandFields.map(([key, val]) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">Command</span>
 <input
 className="bl-node-input nodrag nowheel"
 value={val || ''}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="ticket-panel"
 spellCheck={false}
 />
 <span className="bl-field-hint">Use the command word only. The project prefix is added when the bot runs.</span>
 </div>
 ))}
 </>
 )}

 {type === 'util_afk' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#7EB8F7">AFK Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Default Reason</span>
 <input
 className="bl-node-input nodrag nowheel"
 value={data.defaultReason || ''}
 onChange={(e) => update('defaultReason', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="AFK"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'setMessage', label: 'Set Reply', fallback: '{mention} is now AFK: {reason}' },
 { key: 'mentionMessage', label: 'Mention Reply', fallback: '{afkMention} is AFK: {reason} (since {since})' },
 { key: 'returnMessage', label: 'Return Reply', fallback: 'Welcome back {mention}, I removed your AFK status. You were AFK for {since}.' },
 ].map(({ key, label, fallback }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={3}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#7EB8F7' }}>{'{user} {mention} {reason}'}</span>
 {' - '}
 <span style={{ color: '#A8D08D' }}>{'{afkUser} {afkMention} {since}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{server} {channel}'}</span>
 </span>
 </>
 )}

 {type === 'util_avatar' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#7EB8F7">Avatar Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input nodrag nowheel"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="av"
 spellCheck={false}
 />
 <span className="bl-field-hint">Comma separated. Example: av,pfp</span>
 </div>
 {[
 { key: 'titleTemplate', label: 'User Title', fallback: "{targetName}'s Avatar", rows: 2 },
 { key: 'serverTitleTemplate', label: 'Server Title', fallback: "{server}'s Server Icon", rows: 2 },
 { key: 'descriptionTemplate', label: 'Description', fallback: 'Requested by {mention}', rows: 3 },
 { key: 'noAvatarMessage', label: 'No Avatar Text', fallback: 'No avatar/icon found.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-node-divider" />
 <SectionHead color="#A8D08D">Buttons</SectionHead>
 {[
 ['showDownloadButton', 'downloadButtonLabel', 'Download Button', 'Download'],
 ['showOpenButton', 'openButtonLabel', 'Open Button', 'Open Avatar'],
 ['showServerButton', 'serverButtonLabel', 'Server Button', 'Server Icon'],
 ].map(([enabledKey, labelKey, label, fallback]) => (
 <div key={labelKey} className="bl-field">
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={data[enabledKey] !== false}
 onChange={(e) => update(enabledKey, e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 {label}
 </label>
 <input
 className="bl-node-input nodrag nowheel"
 value={data[labelKey] || ''}
 onChange={(e) => update(labelKey, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={fallback}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#7EB8F7' }}>{'{targetName} {targetMention} {avatarUrl}'}</span>
 {' - '}
 <span style={{ color: '#A8D08D' }}>{'{user} {mention}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{server} {channel}'}</span>
 </span>
 </>
 )}

 {type === 'util_setboost' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F472B6">Boost Settings</SectionHead>
 <div className="bl-field">
 <label className="bl-embed-toggle" style={{ fontSize: 11 }}>
 <input
 type="checkbox"
 checked={data.enabledByDefault !== false}
 onChange={(e) => update('enabledByDefault', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Enabled by default
 </label>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Boost Channel ID</span>
 <input
 className="bl-node-input"
 value={data.boostChannelId || ''}
 onChange={(e) => update('boostChannelId', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Channel ID or #channel"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'panelTitle', label: 'Panel Title', fallback: 'Boost Message Settings', rows: 2 },
 { key: 'panelDescription', label: 'Panel Description', fallback: 'Configure boost announcements for {server}.', rows: 3 },
 { key: 'boostMessage', label: 'Boost Message', fallback: 'Thank you {memberMention} for boosting {server}! We now have {boostCount} boosts.', rows: 4 },
 { key: 'testMessage', label: 'Test Confirmation', fallback: 'Test boost message sent to {channel}.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-node-divider" />
 <SectionHead color="#A8D08D">Button Labels</SectionHead>
 {[
 { key: 'enableButtonLabel', label: 'Enabled Button', fallback: 'Boost Messages: ON' },
 { key: 'disableButtonLabel', label: 'Disabled Button', fallback: 'Boost Messages: OFF' },
 { key: 'testButtonLabel', label: 'Test Button', fallback: 'Send Test' },
 { key: 'resetButtonLabel', label: 'Reset Button', fallback: 'Reset' },
 ].map(({ key, label, fallback }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <input
 className="bl-node-input"
 value={data[key] || ''}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={fallback}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#F472B6' }}>{'{member} {memberMention} {boostCount}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{server} {channel} {status}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{user} {mention}'}</span>
 </span>
 </>
 )}

 {type === 'util_boostcount' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F472B6">Boost Count Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="bc,boosts"
 spellCheck={false}
 />
 <span className="bl-field-hint">Comma separated. Example: bc,boosts</span>
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: '{server} Boost Count', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '{server} currently has **{boostCount}** boosts.\nBoost tier: **{boostTierLabel}**', rows: 4 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: '{server} has {boostCount} boosts ({boostTierLabel}).', rows: 3 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#F472B6' }}>{'{boostCount} {boosts} {boostTier} {boostTierLabel}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{server} {serverId}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{user} {mention} {channel}'}</span>
 </span>
 </>
 )}

 {type === 'util_channelinfo' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#22C55E">Channel Info Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="ci"
 spellCheck={false}
 />
 <span className="bl-field-hint">Comma separated. Example: ci,cinfo</span>
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Channel Info: #{channelName}', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '**Mention:** {channelMention}\n**ID:** `{channelId}`\n**Type:** {channelType}\n**Category:** {category}\n**Topic:** {topic}\n**NSFW:** {nsfw}\n**Slowmode:** {slowmode}\n**Position:** {position}\n**Created:** {createdAt}\n\n**Permissions**\n{permissionsSummary}', rows: 7 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: '#{channelName} ({channelType}) - ID: {channelId} - {permissionsSummary}', rows: 3 },
 { key: 'notFoundMessage', label: 'Not Found Text', fallback: 'I could not find that channel.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#22C55E' }}>{'{channelName} {channelMention} {channelId} {channelType}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{category} {topic} {slowmode} {nsfw}'}</span>
 {' - '}
 <span style={{ color: '#F472B6' }}>{'{permissionsSummary} {canView} {canSend}'}</span>
 </span>
 </>
 )}

 {type === 'util_embedbuilder' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#5865F2">Embed Builder Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="embedbuilder"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'panelButtonLabel', label: 'Panel Text', fallback: 'Improve the Embed', rows: 2 },
 { key: 'defaultAuthorText', label: 'Default Author Text', fallback: '', rows: 2 },
 { key: 'defaultAuthorIcon', label: 'Default Author Icon URL', fallback: '', rows: 2 },
 { key: 'defaultTitle', label: 'Default Title', fallback: 'Embed Title', rows: 2 },
 { key: 'defaultDescription', label: 'Default Description', fallback: 'Embed description goes here.', rows: 4 },
 { key: 'defaultThumbnail', label: 'Default Thumbnail URL', fallback: '', rows: 2 },
 { key: 'defaultImage', label: 'Default Image URL', fallback: '', rows: 2 },
 { key: 'defaultFooterText', label: 'Default Footer Text', fallback: '', rows: 2 },
 { key: 'defaultFooterIcon', label: 'Default Footer Icon URL', fallback: '', rows: 2 },
 { key: 'sentMessage', label: 'Sent Confirmation', fallback: 'Embed sent to this channel.', rows: 2 },
 { key: 'abortedMessage', label: 'Abort Text', fallback: 'Embed builder aborted.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Default Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.defaultColor || '#5865F2'} onChange={(e) => update('defaultColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.defaultColor || '#5865F2'} onChange={(e) => update('defaultColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <div className="bl-node-divider" />
 <SectionHead color="#A8D08D">Builder Button Labels</SectionHead>
 {[
 ['authorTextButtonLabel', 'Author Text'],
 ['authorIconButtonLabel', 'Author Icon'],
 ['titleButtonLabel', 'Title'],
 ['descriptionButtonLabel', 'Description'],
 ['thumbnailButtonLabel', 'Thumbnail'],
 ['imageButtonLabel', 'Image'],
 ['footerTextButtonLabel', 'Footer Text'],
 ['footerIconButtonLabel', 'Footer Icon'],
 ['colorButtonLabel', 'Color'],
 ['resetButtonLabel', 'Reset Embed'],
 ['sendButtonLabel', 'Send to Channel'],
 ['abortButtonLabel', 'Abort'],
 ].map(([key, fallback]) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{fallback}</span>
 <input
 className="bl-node-input"
 value={data[key] || ''}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={fallback}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 Buttons open Discord modals. Send posts the current embed to the channel.
 </span>
 </>
 )}

 {type === 'giveaway_create' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#B45309">Giveaway Setup</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="gcreate,gw"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'panelTitle', label: 'Giveaway Title', fallback: '🎉 GIVEAWAY 🎉', rows: 2 },
 { key: 'setupMessage', label: 'Admin Setup Text', fallback: 'Configure your giveaway, then send it to the selected channel.', rows: 3 },
 { key: 'prize', label: 'Default Prize', fallback: 'Example Prize', rows: 2 },
 { key: 'duration', label: 'Default Duration', fallback: '1d', rows: 1 },
 { key: 'channelId', label: 'Default Channel ID', fallback: 'Leave blank to use current channel', rows: 1 },
 { key: 'durationButtons', label: 'Duration Buttons', fallback: '1h,6h,1d,3d,7d', rows: 2 },
 { key: 'prizeButtonLabel', label: 'Prize Button Text', fallback: 'Prize', rows: 1 },
 { key: 'winnersButtonLabel', label: 'Winners Button Text', fallback: 'Winners', rows: 1 },
 { key: 'customDurationButtonLabel', label: 'Custom Duration Button Text', fallback: 'Custom Duration', rows: 1 },
 { key: 'sendButtonLabel', label: 'Send Button Text', fallback: 'Send Giveaway', rows: 1 },
 { key: 'abortButtonLabel', label: 'Abort Button Text', fallback: 'Abort', rows: 1 },
 { key: 'channelSelectPlaceholder', label: 'Channel Select Placeholder', fallback: 'Select giveaway channel', rows: 1 },
 { key: 'enterEmoji', label: 'Entry Emoji', fallback: '🎉', rows: 1 },
 { key: 'enterButtonLabel', label: 'Entry Button Text', fallback: '{emoji} {count}', rows: 1 },
 { key: 'hostedByTemplate', label: 'Hosted By Text', fallback: 'Hosted by: {host}', rows: 2 },
 { key: 'footerTemplate', label: 'Footer Text', fallback: '{winnerCount} winner • ID: {giveawayId} • Ends • {endTime}', rows: 2 },
 { key: 'endedTitle', label: 'Ended Title', fallback: '🎉 GIVEAWAY ENDED 🎉', rows: 2 },
 { key: 'endedDescription', label: 'Ended Description', fallback: '**{prize}**\nWinner(s): {winners}', rows: 3 },
 { key: 'permissionMessage', label: 'Permission Error', fallback: 'You need Manage Server permission to create giveaways.', rows: 2 },
 { key: 'sentMessage', label: 'Sent Message', fallback: 'Giveaway sent to {channel}.', rows: 2 },
 { key: 'abortedMessage', label: 'Abort Message', fallback: 'Giveaway setup cancelled.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? ''}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={fallback}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Winner Count</span>
 <input
 className="bl-node-input"
 type="number"
 min="1"
 value={data.winnerCount ?? 1}
 onChange={(e) => update('winnerCount', Number(e.target.value) || 1)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#B45309'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#B45309'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 Admins use the Discord setup panel to change prize, duration, winners, and target channel.
 {' '}
 <span style={{ color: '#F59E0B' }}>{'{prize} {duration} {host} {winnerCount} {giveawayId} {endTime} {count}'}</span>
 </span>
 </>
 )}

 {type === 'giveaway_stop' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#DC2626">Stop Giveaways</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="gstop,endgiveaway,stopgiveaway"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Giveaways Stopped', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: 'Stopped **{count}** active giveaway(s) across all channels.', rows: 3 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: 'Stopped {count} active giveaway(s) across all channels.', rows: 2 },
 { key: 'noneMessage', label: 'No Active Message', fallback: 'No active giveaways found in this server.', rows: 2 },
 { key: 'permissionMessage', label: 'Permission Error', fallback: 'You need Manage Server permission to stop giveaways.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not stop giveaways: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? ''}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={fallback}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#DC2626'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#DC2626'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 Stops every active giveaway in this server, no matter which channel it was posted in.
 {' '}
 <span style={{ color: '#F87171' }}>{'{count} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'util_invite' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#5865F2">Invite Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="i,in,inv"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'customInviteUrl', label: 'Custom Invite URL', fallback: 'https://discord.com/oauth2/authorize?...', rows: 2 },
 { key: 'clientId', label: 'Bot Client ID', fallback: 'Leave blank to use running bot ID', rows: 2 },
 { key: 'permissions', label: 'Permissions', fallback: '8', rows: 1 },
 { key: 'scopes', label: 'Scopes', fallback: 'bot applications.commands', rows: 1 },
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Invite {botName}', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: 'Use the button below to invite **{botName}** to your server.', rows: 3 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: 'Invite {botName}: {inviteUrl}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? ''}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={fallback}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-node-divider" />
 <SectionHead color="#A8D08D">Buttons</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Invite Button</span>
 <input
 className="bl-node-input"
 value={data.inviteButtonLabel || ''}
 onChange={(e) => update('inviteButtonLabel', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Invite Bot"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={!!data.showSupportButton}
 onChange={(e) => update('showSupportButton', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Support Button
 </label>
 <input
 className="bl-node-input"
 value={data.supportButtonLabel || ''}
 onChange={(e) => update('supportButtonLabel', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Support Server"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Support URL</span>
 <input
 className="bl-node-input"
 value={data.supportUrl || ''}
 onChange={(e) => update('supportUrl', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="https://discord.gg/..."
 spellCheck={false}
 />
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#7EB8F7' }}>{'{botName} {botId} {inviteUrl}'}</span>
 {' - '}
 <span style={{ color: '#A8D08D' }}>{'{user} {mention}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{server} {channel}'}</span>
 </span>
 </>
 )}

 {type === 'util_membercount' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#22C55E">Member Count Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="mc,members"
 spellCheck={false}
 />
 <span className="bl-field-hint">Comma separated. Example: mc,members</span>
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: '{server} Members', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '**Total Members:** {memberCount}\n**Humans:** {humanCount}\n**Bots:** {botCount}', rows: 4 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: '{server} has {memberCount} members.', rows: 3 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#22C55E' }}>{'{memberCount} {members} {humanCount} {botCount}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{server} {serverId}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{user} {mention} {channel}'}</span>
 </span>
 </>
 )}

 {type === 'util_servericon' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#3B82F6">Server Icon Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="serverav,serveravatar,sicon"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: "{server}'s Server Icon", rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: 'Requested by {mention}\nServer ID: `{serverId}`', rows: 3 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: "{server}'s server icon: {iconUrl}", rows: 2 },
 { key: 'noIconMessage', label: 'No Icon Text', fallback: 'This server does not have an icon.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-node-divider" />
 <SectionHead color="#A8D08D">Buttons</SectionHead>
 {[
 ['showDownloadButton', 'downloadButtonLabel', 'Download Button', 'Download'],
 ['showOpenButton', 'openButtonLabel', 'Open Button', 'Open Icon'],
 ].map(([enabledKey, labelKey, label, fallback]) => (
 <div key={labelKey} className="bl-field">
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={data[enabledKey] !== false}
 onChange={(e) => update(enabledKey, e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 {label}
 </label>
 <input
 className="bl-node-input"
 value={data[labelKey] || ''}
 onChange={(e) => update(labelKey, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={fallback}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#7EB8F7' }}>{'{server} {serverId} {iconUrl}'}</span>
 {' - '}
 <span style={{ color: '#A8D08D' }}>{'{user} {mention}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{channel}'}</span>
 </span>
 </>
 )}

 {type === 'util_stats' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#8B5CF6">Stats Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="botinfo,bi,statistics"
 spellCheck={false}
 />
 <span className="bl-field-hint">Comma separated. Example: botinfo,bi,statistics</span>
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: '{botName} Statistics', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '**Servers:** {serverCount}\n**Users:** {userCount}\n**Channels:** {channelCount}\n**Ping:** {ping}ms\n**Uptime:** {uptime}\n**Memory:** {memoryUsed} / {memoryTotal}\n**Node.js:** {nodeVersion}\n**Discord.js:** {discordVersion}', rows: 7 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: '{botName}: {serverCount} servers, {userCount} users, {ping}ms ping, uptime {uptime}.', rows: 3 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#8B5CF6' }}>{'{botName} {serverCount} {userCount} {channelCount}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{ping} {uptime} {memoryUsed} {memoryTotal}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{nodeVersion} {discordVersion} {platform}'}</span>
 </span>
 </>
 )}

 {type === 'util_steal' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F59E0B">Steal Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="emoji,addemoji"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Default Name</span>
 <input
 className="bl-node-input"
 value={data.defaultName || ''}
 onChange={(e) => update('defaultName', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="stolen"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'successMessage', label: 'Success Text', fallback: 'Added {type} **{name}** to {server}.', rows: 3 },
 { key: 'notFoundMessage', label: 'Not Found Text', fallback: 'Reply to a message with an emoji/sticker or include a custom emoji in the command.', rows: 3 },
 { key: 'permissionMessage', label: 'Permission Text', fallback: 'I need Manage Emojis and Stickers permission to do that.', rows: 2 },
 { key: 'errorMessage', label: 'Error Text', fallback: 'I could not steal that {type}. {error}', rows: 2 },
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Stolen {type}', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '{result}', rows: 3 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: '{result}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#F59E0B' }}>{'{type} {name} {emoji} {url} {result}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{server} {channel}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{user} {mention} {error}'}</span>
 </span>
 </>
 )}

 {type === 'util_userinfo' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#3B82F6">User Info Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="ui,user"
 spellCheck={false}
 />
 <span className="bl-field-hint">Comma separated. Example: ui,user</span>
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'User Info: {targetName}', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '**User:** {targetMention}\n**Tag:** {targetTag}\n**ID:** `{targetId}`\n**Bot:** {targetBot}\n**Created:** {createdAt}\n**Joined:** {joinedAt}\n**Roles:** {roleCount}\n**Top Role:** {topRole}\n**Status:** {status}', rows: 8 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: '{targetTag} ({targetId}) joined {server} on {joinedAt}.', rows: 3 },
 { key: 'notFoundMessage', label: 'Not Found Text', fallback: 'I could not find that user.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#3B82F6' }}>{'{targetName} {targetTag} {targetId} {targetMention}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{createdAt} {joinedAt} {roleCount} {topRole} {status}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{server} {user} {mention}'}</span>
 </span>
 </>
 )}

 {type === 'util_prefix' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#14B8A6">Prefix Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="setprefix"
 spellCheck={false}
 />
 </div>
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={data.requireManageGuild !== false}
 onChange={(e) => update('requireManageGuild', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Require Manage Server
 </label>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Prefix Updated', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: 'Prefix changed from `{oldPrefix}` to `{newPrefix}`.', rows: 3 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: 'Prefix changed from {oldPrefix} to {newPrefix}.', rows: 2 },
 { key: 'currentMessage', label: 'Current Prefix Text', fallback: 'Current prefix is `{oldPrefix}`. Use `{oldPrefix}{command} <new prefix>` to change it.', rows: 3 },
 { key: 'permissionMessage', label: 'Permission Text', fallback: 'You need Manage Server permission to change the prefix.', rows: 2 },
 { key: 'invalidMessage', label: 'Invalid Text', fallback: 'Please provide a prefix from 1 to 5 characters without spaces.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#14B8A6' }}>{'{oldPrefix} {newPrefix} {prefix} {command}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{server} {channel}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{user} {mention}'}</span>
 </span>
 </>
 )}

 {type === 'util_calculator' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#5865F2">Calculator Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="calc,math,solve"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Calculator Screen', rows: 2 },
 { key: 'expressionLabel', label: 'Expression Label', fallback: 'Expression', rows: 1 },
 { key: 'resultLabel', label: 'Result Label', fallback: 'Result', rows: 1 },
 { key: 'statusLabel', label: 'Status Label', fallback: 'Status', rows: 1 },
 { key: 'readyText', label: 'Ready Text', fallback: 'Ready', rows: 1 },
 { key: 'errorText', label: 'Error Text', fallback: 'Error', rows: 1 },
 { key: 'footerTemplate', label: 'Footer', fallback: 'Aliases: {aliases} - Today at {time}', rows: 2 },
 { key: 'onlyUserMessage', label: 'Only User Text', fallback: 'Only {user} can use this calculator.', rows: 2 },
 { key: 'timeoutMessage', label: 'Timeout Text', fallback: 'Calculator session expired.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#5865F2' }}>{'{expression} {result} {status}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{command} {aliases} {time}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{user} {server} {channel}'}</span>
 </span>
 </>
 )}

 {type === 'info_playing' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#22C55E">Bot Activity</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Activity Name</span>
 <input
 className="bl-node-input"
 value={data.activityName || ''}
 onChange={(e) => update('activityName', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="ROBLOX"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Activity Type</span>
 <select
 className="bl-node-input"
 value={data.activityType || 'Playing'}
 onChange={(e) => update('activityType', e.target.value)}
 onPointerDown={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 >
 <option value="Playing">Playing</option>
 <option value="Watching">Watching</option>
 <option value="Listening">Listening</option>
 <option value="Competing">Competing</option>
 <option value="Streaming">Streaming</option>
 </select>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Producer Name</span>
 <input
 className="bl-node-input"
 value={data.producerName || ''}
 onChange={(e) => update('producerName', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Producer"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Status</span>
 <select
 className="bl-node-input"
 value={data.status || 'online'}
 onChange={(e) => update('status', e.target.value)}
 onPointerDown={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 >
 <option value="online">online</option>
 <option value="idle">idle</option>
 <option value="dnd">dnd</option>
 <option value="invisible">invisible</option>
 </select>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Activity Image URL</span>
 <input
 className="bl-node-input"
 value={data.imageUrl || ''}
 onChange={(e) => update('imageUrl', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="https://...image.png"
 spellCheck={false}
 />
 </div>
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={data.useAnimatedAvatar === true}
 onChange={(e) => update('useAnimatedAvatar', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Use Animated Avatar
 </label>
 <div className="bl-field">
 <span className="bl-field-lbl">Animated Avatar URL</span>
 <input
 className="bl-node-input"
 value={data.animatedAvatarUrl || ''}
 onChange={(e) => update('animatedAvatarUrl', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="https://...avatar.gif"
 spellCheck={false}
 />
 </div>
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={data.useAnimatedBanner === true}
 onChange={(e) => update('useAnimatedBanner', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Use Animated Banner
 </label>
 <div className="bl-field">
 <span className="bl-field-lbl">Animated Banner URL</span>
 <input
 className="bl-node-input"
 value={data.animatedBannerUrl || ''}
 onChange={(e) => update('animatedBannerUrl', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="https://...banner.gif"
 spellCheck={false}
 />
 </div>
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={data.requireManageGuild !== false}
 onChange={(e) => update('requireManageGuild', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Require Manage Server
 </label>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Bot Activity Updated', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '**Type:** {activityType}\n**Name:** {activityName}\n**Producer:** {producerName}\n**Status:** {status}\n**Profile:** {profileUpdate}', rows: 6 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: 'Bot activity set to {activityType} {activityName} by {producerName}.', rows: 2 },
 { key: 'permissionMessage', label: 'Permission Text', fallback: 'You need Manage Server permission to change my activity.', rows: 2 },
 { key: 'clearedMessage', label: 'Cleared Text', fallback: 'Bot activity cleared.', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#22C55E' }}>{'{activityName} {activityType} {producerName} {status}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{imageUrl} {animatedAvatarUrl} {animatedBannerUrl} {profileUpdate}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{user} {server}'}</span>
 </span>
 </>
 )}

 {type === 'info_botinfo' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#5865F2">Bot Info</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="bot,aboutbot,bi" spellCheck={false} />
 </div>
 {[
 ['ownerId', 'Owner ID', ''],
 ['ownerName', 'Owner Name', 'Bot Owner'],
 ['manualCommandCount', 'Manual Command Count', '0'],
 ['bannerUrl', 'Banner URL', 'https://.../banner.png'],
 ['inviteUrl', 'Invite URL', 'https://discord.com/oauth2/authorize?...'],
 ['supportUrl', 'Support URL', 'https://discord.gg/...'],
 ].map(([key, label, placeholder]) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <input className="bl-node-input" value={data[key] || ''} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder={placeholder} spellCheck={false} />
 </div>
 ))}
 {[
 { key: 'titleTemplate', label: 'Title', fallback: '{bot_name} Bot Info', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Identity**\nBot: `{bot_name}`\nBot ID: `{bot_id}`\nOwner: {owner}\nCreated: `{created_at}`\n\n**Stats**\nCommands: `{command_count}`\nPing: `{ping}`\nUptime: `{uptime}`\nServers: `{server_count}`\nUsers: `{user_count}`\nChannels: `{channel_count}`\n\n**System**\nDiscord.js: `{discordjs_version}`\nNode.js: `{node_version}`\nMemory: `{memory}`\nPrefix: `{prefix}`\n\n**Links**\nInvite: {invite_link}\nSupport: {support_link}', rows: 19 },
 { key: 'footerTemplate', label: 'Footer', fallback: 'Requested by {user}', rows: 1 },
 { key: 'notBotMessage', label: 'Unavailable Message', fallback: 'Bot information is unavailable right now.', rows: 2 },
 { key: 'profileLinkLabel', label: 'Invite Link Label', fallback: 'Open Invite', rows: 1 },
 { key: 'supportLinkLabel', label: 'Support Link Label', fallback: 'Support Server', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#5865F2' }}>{'{bot_name} {bot_id} {owner} {command_count} {ping} {uptime}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{server_count} {user_count} {memory} {avatar_url} {banner_url}'}</span>
 </span>
 </>
 )}

 {type === 'admin_welcome' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#22C55E">Welcome</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="welcometest,testwelcome,wlc" spellCheck={false} />
 </div>
 {[
 ['channelId', 'Welcome Channel ID', '123456789012345678'],
 ['deleteAfterSeconds', 'Delete After Seconds', '0'],
 ['authorName', 'Author Name', '{server}'],
 ['authorIconUrl', 'Author Icon URL', '{server_icon}'],
 ['thumbnailUrl', 'Thumbnail URL', '{avatar_url}'],
 ['imageUrl', 'Banner Image URL', 'https://.../welcome.png'],
 ['buttonLabel', 'Button Label', 'Read Rules'],
 ['buttonUrl', 'Button URL', 'https://...'],
 ].map(([key, label, placeholder]) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <input className="bl-node-input" value={data[key] || ''} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder={placeholder} spellCheck={false} />
 </div>
 ))}
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input type="checkbox" checked={data.requireManageGuild !== false} onChange={(e) => update('requireManageGuild', e.target.checked)} onMouseDown={(e) => e.stopPropagation()} />
 Require Manage Server for test command
 </label>
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input type="checkbox" checked={data.mentionUser !== false} onChange={(e) => update('mentionUser', e.target.checked)} onMouseDown={(e) => e.stopPropagation()} />
 Mention user above welcome embed
 </label>
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input type="checkbox" checked={data.embedEnabled !== false} onChange={(e) => update('embedEnabled', e.target.checked)} onMouseDown={(e) => e.stopPropagation()} />
 Send as embed
 </label>
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div style={{ display: 'flex', gap: 6 }}>
 <input type="color" className="bl-color-pick" value={data.embedColor || '#22C55E'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#22C55E'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Welcome to {server}, {username}!', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: 'Hey {mention}, we are happy to have you here.\n\nYou are member **#{member_count}**.\nAccount created: `{account_created}`', rows: 6 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: 'Welcome {mention} to {server}! You are member #{member_count}.', rows: 2 },
 { key: 'footerTemplate', label: 'Footer', fallback: 'User ID: {user_id}', rows: 1 },
 { key: 'testModeMessage', label: 'Test Sent Message', fallback: 'Welcome preview sent in {channel}.', rows: 2 },
 { key: 'permissionMessage', label: 'Permission Message', fallback: 'You need Manage Server permission to test the welcome message.', rows: 2 },
 { key: 'missingChannelMessage', label: 'Missing Channel Message', fallback: 'Welcome channel not found. Add a channel ID in the Welcome node.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not send welcome message: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#22C55E' }}>{'{username} {mention} {server} {member_count} {account_created}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{avatar_url} {server_icon} {channel} {user_id} {error}'}</span>
 </span>
 </>
 )}

 {type === 'admin_restart' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F97316">Restart Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="reboot,restartbot"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Restarting Bot', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '{botName} is restarting now. I will reconnect in a moment.', rows: 3 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: '{botName} is restarting now.', rows: 2 },
 { key: 'successMessage', label: 'Success Text', fallback: 'Restart command accepted.', rows: 2 },
 { key: 'permissionMessage', label: 'Permission Error', fallback: 'You need Manage Server permission to restart the bot.', rows: 2 },
 { key: 'unavailableMessage', label: 'Unavailable Text', fallback: 'Restart is not available in this runtime.', rows: 2 },
 { key: 'errorMessage', label: 'Error Text', fallback: 'Could not restart bot: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? ''}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={fallback}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Restart Delay MS</span>
 <input
 className="bl-node-input"
 type="number"
 min="250"
 value={data.delayMs ?? 1200}
 onChange={(e) => update('delayMs', Number(e.target.value) || 1200)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#F97316'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#F97316'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 Variables: <span style={{ color: '#F97316' }}>{'{botName} {botTag} {user} {mention} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'admin_shutdown' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#EF4444">Shutdown Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="stopbot,off" spellCheck={false} />
 </div>
 {[
 { key: 'titleTemplate', label: 'Embed Title', fallback: 'Shutting Down Bot', rows: 2 },
 { key: 'descriptionTemplate', label: 'Embed Description', fallback: '{botName} is shutting down now.', rows: 3 },
 { key: 'plainTextTemplate', label: 'Plain Text', fallback: '{botName} is shutting down now.', rows: 2 },
 { key: 'permissionMessage', label: 'Permission Error', fallback: 'You need Manage Server permission to shutdown the bot.', rows: 2 },
 { key: 'unavailableMessage', label: 'Unavailable Text', fallback: 'Shutdown is not available in this runtime.', rows: 2 },
 { key: 'errorMessage', label: 'Error Text', fallback: 'Could not shutdown bot: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? ''} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder={fallback} rows={rows} spellCheck={false} />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Shutdown Delay MS</span>
 <input className="bl-node-input" type="number" min="250" value={data.delayMs ?? 1200} onChange={(e) => update('delayMs', Number(e.target.value) || 1200)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#EF4444'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#EF4444'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 Variables: <span style={{ color: '#F87171' }}>{'{botName} {botTag} {user} {mention} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'moderation_nuke' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#DC2626">Nuke Settings</SectionHead>
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={data.confirmationRequired !== false}
 onChange={(e) => update('confirmationRequired', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Require Confirmation
 </label>
 <div className="bl-field">
 <span className="bl-field-lbl">Confirm Keyword</span>
 <input
 className="bl-node-input"
 value={data.confirmationKeyword || ''}
 onChange={(e) => update('confirmationKeyword', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="confirm"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'reason', label: 'Audit Log Reason', fallback: 'Channel nuked by {user}', rows: 2 },
 { key: 'successMessage', label: 'Success Message', fallback: 'Channel nuked by {mention}. This is the new {channelMention}.', rows: 3 },
 { key: 'confirmMessage', label: 'Confirm Message', fallback: 'This will delete the whole channel and recreate it. Run `{command} {confirmationKeyword}` to confirm.', rows: 3 },
 { key: 'permissionMessage', label: 'Permission Message', fallback: 'You and I both need Manage Channels permission to nuke this channel.', rows: 2 },
 { key: 'unsupportedMessage', label: 'Unsupported Message', fallback: 'This channel type cannot be nuked.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Failed to nuke channel: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#DC2626' }}>{'{command} {confirmationKeyword} {error}'}</span>
 {' - '}
 <span style={{ color: '#7EB8F7' }}>{'{channel} {channelMention} {channelId}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{user} {mention} {server}'}</span>
 </span>
 </>
 )}

 {type === 'moderation_voicekick' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#0EA5E9">Voice Kick Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="vckick,vkick,disconnect"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'reason', label: 'Default Reason', fallback: 'No reason provided', rows: 2 },
 { key: 'successMessage', label: 'Success Message', fallback: '{targetMention} was kicked from voice by {mention}.\nReason: {reason}', rows: 3 },
 { key: 'usageMessage', label: 'Usage Message', fallback: 'Usage: `{command} @user [reason]`', rows: 2 },
 { key: 'permissionMessage', label: 'User Permission Error', fallback: 'You need Move Members permission to voice kick users.', rows: 2 },
 { key: 'botPermissionMessage', label: 'Bot Permission Error', fallback: 'I need Move Members permission to voice kick users.', rows: 2 },
 { key: 'notInVoiceMessage', label: 'Not In Voice Message', fallback: '{targetMention} is not connected to a voice channel.', rows: 2 },
 { key: 'selfMessage', label: 'Self Kick Message', fallback: 'You cannot voice kick yourself.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Failed to voice kick: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#0EA5E9'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#0EA5E9'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#0EA5E9' }}>{'{targetMention} {target} {targetId} {voiceChannel} {voiceChannelId}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{reason} {command} {user} {mention} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'moderation_voiceban' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#8B5CF6">Voice Ban Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="vcban,vban"
 spellCheck={false}
 />
 </div>
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input
 type="checkbox"
 checked={data.disconnectAfterBan !== false}
 onChange={(e) => update('disconnectAfterBan', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Disconnect after ban
 </label>
 {[
 { key: 'reason', label: 'Default Reason', fallback: 'No reason provided', rows: 2 },
 { key: 'successMessage', label: 'Success Message', fallback: '{targetMention} was banned from **{voiceChannel}** by {mention}.\nReason: {reason}', rows: 3 },
 { key: 'usageMessage', label: 'Usage Message', fallback: 'Usage: `{command} @user [reason]`', rows: 2 },
 { key: 'permissionMessage', label: 'User Permission Error', fallback: 'You need Manage Channels permission to voice ban users.', rows: 2 },
 { key: 'botPermissionMessage', label: 'Bot Permission Error', fallback: 'I need Manage Channels permission to voice ban users.', rows: 2 },
 { key: 'movePermissionMessage', label: 'Move Permission Error', fallback: 'I need Move Members permission to disconnect the user after banning them.', rows: 2 },
 { key: 'notInVoiceMessage', label: 'Not In Voice Message', fallback: '{targetMention} is not connected to a voice channel.', rows: 2 },
 { key: 'selfMessage', label: 'Self Ban Message', fallback: 'You cannot voice ban yourself.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Failed to voice ban: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#8B5CF6'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#8B5CF6'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#A78BFA' }}>{'{targetMention} {target} {targetId} {voiceChannel} {voiceChannelId}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{reason} {command} {user} {mention} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'moderation_voiceunban' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#22C55E">Voice Unban Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="vcunban,vunban"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Voice Channel ID</span>
 <input
 className="bl-node-input"
 value={data.channelId || ''}
 onChange={(e) => update('channelId', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Optional channel id"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'reason', label: 'Default Reason', fallback: 'No reason provided', rows: 2 },
 { key: 'successMessage', label: 'Success Message', fallback: '{targetMention} was unbanned from **{voiceChannel}** by {mention}.\nReason: {reason}', rows: 3 },
 { key: 'usageMessage', label: 'Usage Message', fallback: 'Usage: `{command} @user [voiceChannelId] [reason]`', rows: 2 },
 { key: 'permissionMessage', label: 'User Permission Error', fallback: 'You need Manage Channels permission to voice unban users.', rows: 2 },
 { key: 'botPermissionMessage', label: 'Bot Permission Error', fallback: 'I need Manage Channels permission to voice unban users.', rows: 2 },
 { key: 'channelMessage', label: 'Missing Channel Message', fallback: 'I could not find the voice channel. Add a Voice Channel ID in the node or command.', rows: 2 },
 { key: 'selfMessage', label: 'Self Unban Message', fallback: 'You cannot voice unban yourself.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Failed to voice unban: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#22C55E'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#22C55E'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#22C55E' }}>{'{targetMention} {target} {targetId} {voiceChannel} {voiceChannelId}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{reason} {command} {user} {mention} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'moderation_voicemute' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F97316">Voice Mute Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="vcmute,vmute"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'reason', label: 'Default Reason', fallback: 'No reason provided', rows: 2 },
 { key: 'successMessage', label: 'Success Message', fallback: '{targetMention} was voice muted in **{voiceChannel}** by {mention}.\nReason: {reason}', rows: 3 },
 { key: 'usageMessage', label: 'Usage Message', fallback: 'Usage: `{command} @user [reason]`', rows: 2 },
 { key: 'permissionMessage', label: 'User Permission Error', fallback: 'You need Mute Members permission to voice mute users.', rows: 2 },
 { key: 'botPermissionMessage', label: 'Bot Permission Error', fallback: 'I need Mute Members permission to voice mute users.', rows: 2 },
 { key: 'notInVoiceMessage', label: 'Not In Voice Message', fallback: '{targetMention} is not connected to a voice channel.', rows: 2 },
 { key: 'alreadyMutedMessage', label: 'Already Muted Message', fallback: '{targetMention} is already voice muted.', rows: 2 },
 { key: 'selfMessage', label: 'Self Mute Message', fallback: 'You cannot voice mute yourself.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Failed to voice mute: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#F97316'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#F97316'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#F97316' }}>{'{targetMention} {target} {targetId} {voiceChannel} {voiceChannelId}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{reason} {command} {user} {mention} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'moderation_voiceunmute' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#14B8A6">Voice Unmute Text</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input
 className="bl-node-input"
 value={data.aliases || ''}
 onChange={(e) => update('aliases', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="vcunmute,vunmute"
 spellCheck={false}
 />
 </div>
 {[
 { key: 'reason', label: 'Default Reason', fallback: 'No reason provided', rows: 2 },
 { key: 'successMessage', label: 'Success Message', fallback: '{targetMention} was voice unmuted in **{voiceChannel}** by {mention}.\nReason: {reason}', rows: 3 },
 { key: 'usageMessage', label: 'Usage Message', fallback: 'Usage: `{command} @user [reason]`', rows: 2 },
 { key: 'permissionMessage', label: 'User Permission Error', fallback: 'You need Mute Members permission to voice unmute users.', rows: 2 },
 { key: 'botPermissionMessage', label: 'Bot Permission Error', fallback: 'I need Mute Members permission to voice unmute users.', rows: 2 },
 { key: 'notInVoiceMessage', label: 'Not In Voice Message', fallback: '{targetMention} is not connected to a voice channel.', rows: 2 },
 { key: 'notMutedMessage', label: 'Not Muted Message', fallback: '{targetMention} is not voice muted.', rows: 2 },
 { key: 'selfMessage', label: 'Self Unmute Message', fallback: 'You cannot voice unmute yourself.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Failed to voice unmute: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea
 className="bl-node-textarea"
 value={data[key] ?? fallback}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={rows}
 spellCheck={false}
 />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#14B8A6'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#14B8A6'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#14B8A6' }}>{'{targetMention} {target} {targetId} {voiceChannel} {voiceChannelId}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{reason} {command} {user} {mention} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'moderation_vmoveall' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#6366F1">Voice Move All</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="moveall,voiceall,vcallmove" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Source Channel ID</span>
 <input className="bl-node-input" value={data.sourceChannelId || ''} onChange={(e) => update('sourceChannelId', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Optional, uses your current VC" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Target Channel ID</span>
 <input className="bl-node-input" value={data.targetChannelId || ''} onChange={(e) => update('targetChannelId', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Optional, or pass in command" spellCheck={false} />
 </div>
 {[
 { key: 'reason', label: 'Default Reason', fallback: 'No reason provided', rows: 2 },
 { key: 'successMessage', label: 'Success Message', fallback: 'Moved **{movedCount}** users from **{sourceChannel}** to **{targetChannel}**.\nReason: {reason}', rows: 3 },
 { key: 'usageMessage', label: 'Usage Message', fallback: 'Usage: `{command} <targetVoiceChannelId|#voice-name> [reason]`', rows: 2 },
 { key: 'permissionMessage', label: 'User Permission Error', fallback: 'You need Move Members permission to move everyone.', rows: 2 },
 { key: 'botPermissionMessage', label: 'Bot Permission Error', fallback: 'I need Move Members permission to move everyone.', rows: 2 },
 { key: 'sourceMessage', label: 'Missing Source Message', fallback: 'I could not find the source voice channel. Join a voice channel or add a Source Channel ID.', rows: 2 },
 { key: 'targetMessage', label: 'Missing Target Message', fallback: 'I could not find the target voice channel. Add a Target Channel ID in the node or command.', rows: 2 },
 { key: 'emptyMessage', label: 'Empty Source Message', fallback: 'There are no movable members in **{sourceChannel}**.', rows: 2 },
 { key: 'sameChannelMessage', label: 'Same Channel Message', fallback: 'Source and target voice channels must be different.', rows: 2 },
 { key: 'partialMessage', label: 'Partial Move Message', fallback: 'Moved **{movedCount}** users, but **{failedCount}** users could not be moved.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Failed to move users: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#6366F1'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#6366F1'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#818CF8' }}>{'{sourceChannel} {sourceChannelId} {targetChannel} {targetChannelId} {movedCount} {failedCount} {totalCount}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{reason} {command} {user} {mention} {server} {channel} {error}'}</span>
 </span>
 </>
 )}

 {type === 'moderation_antinuke' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#3B82F6">Antinuke Setup</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="an,antinukeconfig" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Punishment</span>
 <select className="bl-node-input nodrag nowheel" value={data.punishment || 'remove_roles'} onChange={(e) => update('punishment', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
 <option value="remove_roles">Remove Roles</option>
 <option value="kick">Kick</option>
 <option value="ban">Ban</option>
 </select>
 </div>
 {[
 ['enabledByDefault', 'Enabled by default'],
 ['autoRecovery', 'Auto recovery'],
 ['deleteTriggerMessage', 'Delete trigger messages'],
 ].map(([key, label]) => (
 <label key={key} className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input type="checkbox" checked={data[key] !== false} onChange={(e) => update(key, e.target.checked)} onMouseDown={(e) => e.stopPropagation()} />
 {label}
 </label>
 ))}
 {[
 ['logChannelId', 'Log Channel ID', 'Optional log channel id'],
 ['whitelistUserIds', 'Whitelist User IDs', '123,456'],
 ['whitelistRoleIds', 'Whitelist Role IDs', '123,456'],
 ['tickText', 'Tick Text', '✓'],
 ['crossText', 'Cross Text', '✕'],
 ].map(([key, label, placeholder]) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <input className="bl-node-input" value={data[key] || ''} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder={placeholder} spellCheck={false} />
 </div>
 ))}
 <div className="bl-node-divider" />
 <SectionHead color="#60A5FA">Panel Text</SectionHead>
 {[
 { key: 'panelTitle', label: 'Panel Title', fallback: 'Configure Antinuke', rows: 1 },
 { key: 'panelDescription', label: 'Panel Description', fallback: 'Prevent harmful activities with active monitoring.', rows: 2 },
 { key: 'statusLine', label: 'Status Line', fallback: 'Current Status: {status}', rows: 1 },
 { key: 'featuresTitle', label: 'Features Title', fallback: 'Antinuke Features Enabled', rows: 1 },
 { key: 'featuresFooter', label: 'Footer', fallback: 'Powered by Kiodium Development', rows: 1 },
 { key: 'enabledMessage', label: 'Enabled Message', fallback: 'Antinuke is now enabled.', rows: 2 },
 { key: 'disabledMessage', label: 'Disabled Message', fallback: 'Antinuke is now disabled.', rows: 2 },
 { key: 'permissionMessage', label: 'Permission Message', fallback: 'You need Administrator permission to configure antinuke.', rows: 2 },
 { key: 'botPermissionMessage', label: 'Bot Permission Message', fallback: 'I need Administrator permission to protect this server.', rows: 2 },
 { key: 'blockedMessage', label: 'Blocked Log Message', fallback: 'Antinuke blocked {action} by {executorMention}. Punishment: {punishment}.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Antinuke error: {error}', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <div className="bl-node-divider" />
 <SectionHead color="#22C55E">Feature Toggles</SectionHead>
 {[
 ['antiBan', 'Anti Ban'], ['antiUnban', 'Anti Unban'], ['antiKick', 'Anti Kick'],
 ['antiBotAdd', 'Anti Bot Add'], ['antiChannelCreate', 'Anti Channel Create'],
 ['antiChannelDelete', 'Anti Channel Delete'], ['antiChannelUpdate', 'Anti Channel Update'],
 ['antiRoleCreate', 'Anti Role Create'], ['antiRoleDelete', 'Anti Role Delete'],
 ['antiRoleUpdate', 'Anti Role Update'], ['antiMemberUpdate', 'Anti Member Update'],
 ['antiEmojiStickerCreate', 'Anti Emoji/Sticker Create'],
 ['antiEmojiStickerDelete', 'Anti Emoji/Sticker Delete'],
 ['antiEmojiStickerUpdate', 'Anti Emoji/Sticker Update'],
 ['antiEveryoneHerePing', 'Anti Everyone/Here Ping'], ['antiRolePing', 'Anti Role Ping'],
 ['antiIntegration', 'Anti Integration'], ['antiGuildUpdate', 'Anti Guild Update'],
 ['antiWebhookCreate', 'Anti Webhook Create'], ['antiWebhookDelete', 'Anti Webhook Delete'],
 ['antiWebhookUpdate', 'Anti Webhook Update'], ['antiLinkRole', 'Anti Link Role'],
 ['antiInviteRole', 'Anti Invite Role'],
 ].map(([key, label]) => (
 <label key={key} className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 3 }}>
 <input type="checkbox" checked={data[key] !== false} onChange={(e) => update(key, e.target.checked)} onMouseDown={(e) => e.stopPropagation()} />
 {label}
 </label>
 ))}
 <div className="bl-field">
 <span className="bl-field-lbl">Embed Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#3B82F6'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input className="bl-node-input" value={data.embedColor || '#3B82F6'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#60A5FA' }}>{'{status} {action} {executorMention} {punishment}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{server} {serverId} {error}'}</span>
 </span>
 </>
 )}

 {type === 'music_play' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#5865F2">Lavalink</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="p" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Lavalink URL</span>
 <input className="bl-node-input" value={data.lavalinkUrl || ''} onChange={(e) => update('lavalinkUrl', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="https://your-lavalink-host.com" spellCheck={false} />
 </div>
 {[
 ['lavalinkHost', 'Host', 'localhost'],
 ['lavalinkPort', 'Port', '2333'],
 ['lavalinkPassword', 'Password', 'youshallnotpass'],
 ['youtubeSearchPrefix', 'YouTube Search Prefix', 'ytsearch:'],
 ['fallbackSearchPrefixes', 'Fallback Search Prefixes', 'ytsearch:,ytmsearch:,scsearch:'],
 ['volume', 'Volume', '100'],
 ].map(([key, label, fallback]) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <input className="bl-node-input" value={data[key] || ''} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder={fallback} spellCheck={false} />
 </div>
 ))}
 <label className="bl-embed-toggle" style={{ fontSize: 11, marginBottom: 4 }}>
 <input type="checkbox" checked={data.lavalinkSecure === true} onChange={(e) => update('lavalinkSecure', e.target.checked)} onMouseDown={(e) => e.stopPropagation()} />
 Secure Lavalink
 </label>
 <div className="bl-node-divider" />
 <SectionHead color="#A78BFA">Player Text</SectionHead>
 {[
 { key: 'nowPlayingTitle', label: 'Song Title', fallback: '{title}', rows: 1 },
 { key: 'artistTemplate', label: 'Artist Text', fallback: '{author}', rows: 1 },
 { key: 'durationTemplate', label: 'Duration Text', fallback: '{duration}', rows: 1 },
 { key: 'queuedMessage', label: 'Queued Message', fallback: 'Added **{title}** to the queue.', rows: 2 },
 { key: 'missingQueryMessage', label: 'Missing Query', fallback: 'Use `{command} <song name or url>` to play music.', rows: 2 },
 { key: 'missingVoiceMessage', label: 'Missing Voice', fallback: 'Join a voice channel first.', rows: 2 },
 { key: 'noResultsMessage', label: 'No Results', fallback: 'No tracks found for `{query}`.', rows: 2 },
 { key: 'lavalinkErrorMessage', label: 'Lavalink Error', fallback: 'Music playback failed. Details: {error}', rows: 2 },
 { key: 'completedMessage', label: 'Completed Message', fallback: 'Use `{command}` to add more songs to the queue', rows: 2 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <SectionHead color="#60A5FA">Button Labels</SectionHead>
 {[
 ['shuffleButtonLabel', 'Shuffle'], ['previousButtonLabel', 'Previous'], ['pauseButtonLabel', 'Pause'],
 ['resumeButtonLabel', 'Resume'],
 ['skipButtonLabel', 'Skip'], ['queueButtonLabel', 'Queue'], ['autoplayButtonLabel', 'Start Autoplay'],
 ['restartButtonLabel', 'Restart Queue'], ['disconnectButtonLabel', 'Disconnect bot'],
 ['playlistsButtonLabel', 'Playlists'], ['browseButtonLabel', 'Browse'], ['settingsButtonLabel', 'Settings'],
 ].map(([key, fallback]) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{fallback}</span>
 <input className="bl-node-input" value={data[key] || ''} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder={fallback} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#5865F2' }}>{'{title} {author} {duration} {posterUrl}'}</span>
 {' - '}
 <span style={{ color: '#888' }}>{'{command} {query} {user} {error}'}</span>
 </span>
 </>
 )}

 {type === 'game_minecraft_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#22C55E">Minecraft Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="profile,mcprofile,minecraftprofile" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Default Edition</span>
 <select className="bl-node-input nodrag nowheel" value={data.defaultEdition || 'auto'} onChange={(e) => update('defaultEdition', e.target.value)} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
 <option value="auto">Auto</option>
 <option value="java">Java</option>
 <option value="bedrock">Bedrock</option>
 </select>
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Minecraft profile for {mc_name}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**UUID**\n`{mc_uuid}`\n\n**Textures**\nSkin: {skin_link}\n\n**Information**\nUsername Changes: `{name_change_count}`\nEdition: `{edition}`\nDiscord: {user_tag}\n\n**Name History**\n{name_history}', rows: 9 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Minecraft profile found for `{query}`.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Minecraft profile: {error}', rows: 2 },
 { key: 'skinLinkLabel', label: 'Skin Link Label', fallback: 'Open Skin', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#22C55E' }}>{'{mc_name} {mc_uuid} {edition} {name_history}'}</span>
                {' - '}
 <span style={{ color: '#888' }}>{'{query} {user_tag} {skin_link} {error}'}</span>
 </span>
 </>
 )}

 {type === 'game_roblox_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#E11D48">Roblox Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="robloxprofile,rbprofile,roblox" spellCheck={false} />
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Roblox profile for {roblox_name}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**User ID**\n`{roblox_id}`\n\n**Profile**\nUsername: `{roblox_name}`\nDisplay Name: `{display_name}`\nCreated: `{created_at}`\nVerified: `{verified}`\nBanned: `{banned}`\n\n**Social**\nFriends: `{friends}`\nFollowing: `{following}`\nFollowers: `{followers}`\n\n**About**\n{description}\n\n**Links**\nProfile: {profile_link}', rows: 13 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Roblox profile found for `{query}`.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Roblox profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Profile', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#E11D48' }}>{'{roblox_name} {roblox_id} {display_name} {friends} {followers}'}</span>
                {' - '}
 <span style={{ color: '#888' }}>{'{profile_link} {description} {created_at} {error}'}</span>
 </span>
 </>
 )}

 {type === 'game_fortnite_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#8B5CF6">Fortnite Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="fprofile,fnprofile,fortniteprofile" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Fortnite API Key</span>
 <input className="bl-node-input" value={data.apiKey || ''} onChange={(e) => update('apiKey', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Paste fortnite-api.com key" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Account Type</span>
 <select className="bl-node-input nodrag nowheel" value={data.accountType || 'epic'} onChange={(e) => update('accountType', e.target.value)} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
 <option value="epic">Epic</option>
 <option value="psn">PlayStation</option>
 <option value="xbl">Xbox</option>
 </select>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Stats Window</span>
 <select className="bl-node-input nodrag nowheel" value={data.timeWindow || 'lifetime'} onChange={(e) => update('timeWindow', e.target.value)} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
 <option value="lifetime">Lifetime</option>
 <option value="season">Season</option>
 </select>
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Fortnite profile for {fortnite_name}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Account**\nName: `{fortnite_name}`\nAccount ID: `{account_id}`\nPlatform: `{platform}`\nWindow: `{time_window}`\n\n**Battle Royale**\nWins: `{wins}`\nKills: `{kills}`\nMatches: `{matches}`\nK/D: `{kd}`\nWin Rate: `{win_rate}`\nScore: `{score}`\n\n**Links**\nProfile: {profile_link}', rows: 14 },
 { key: 'missingKeyMessage', label: 'Missing API Key', fallback: 'Fortnite API key is missing. Add it in the Fortnite Profile node.', rows: 2 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Fortnite profile found for `{query}`.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Fortnite profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Profile', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#8B5CF6' }}>{'{fortnite_name} {account_id} {platform} {time_window} {wins} {kills}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{matches} {kd} {win_rate} {score} {profile_link} {error}'}</span>
 </span>
 </>
 )}

 {type === 'game_valorant_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#FF4655">Valorant Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="vprofile,valprofile,valorantprofile" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Valorant API Key</span>
 <input className="bl-node-input" value={data.apiKey || ''} onChange={(e) => update('apiKey', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Paste HenrikDev API key" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Region</span>
 <select className="bl-node-input nodrag nowheel" value={data.region || 'ap'} onChange={(e) => update('region', e.target.value)} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
 <option value="ap">AP</option>
 <option value="na">NA</option>
 <option value="eu">EU</option>
 <option value="kr">KR</option>
 <option value="br">BR</option>
 <option value="latam">LATAM</option>
 </select>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Platform</span>
 <select className="bl-node-input nodrag nowheel" value={data.platform || 'pc'} onChange={(e) => update('platform', e.target.value)} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
 <option value="pc">PC</option>
 <option value="console">Console</option>
 </select>
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Valorant profile for {valorant_name}#{valorant_tag}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Account**\nName: `{valorant_name}`\nTag: `{valorant_tag}`\nRegion: `{region}`\nPlatform: `{platform}`\nLevel: `{account_level}`\n\n**Competitive**\nCurrent Rank: `{current_rank}`\nRR: `{rr}`\nELO: `{elo}`\nLast Change: `{last_change}`\nPeak Rank: `{peak_rank}`\nLeaderboard: `{leaderboard_rank}`\n\n**Links**\nProfile: {profile_link}', rows: 15 },
 { key: 'missingKeyMessage', label: 'Missing API Key', fallback: 'Set a HenrikDev Valorant API key in this node before using `{command}`.', rows: 2 },
 { key: 'invalidNameMessage', label: 'Invalid Riot ID', fallback: 'Use `{command} Name#TAG` to check a Valorant profile.', rows: 2 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Valorant profile found for `{query}`. Check the Riot ID, tag, region, or privacy settings.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Valorant profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Profile', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#FF4655' }}>{'{valorant_name} {valorant_tag} {region} {platform} {current_rank} {rr}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{elo} {peak_rank} {leaderboard_rank} {profile_link} {error}'}</span>
 </span>
 </>
 )}

 {type === 'game_counter_strike_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F59E0B">Counter-Strike Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="cstrike,csprofile,counterstrike" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Steam API Key</span>
 <input className="bl-node-input" value={data.apiKey || ''} onChange={(e) => update('apiKey', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Paste Steam Web API key" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Steam App ID</span>
 <input className="bl-node-input" value={data.appId || '730'} onChange={(e) => update('appId', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="730" spellCheck={false} />
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Counter-Strike profile for {steam_name}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Steam**\nSteamID: `{steam_id}`\nVisibility: `{visibility}`\nStatus: `{persona_state}`\nProfile: {profile_link}\n\n**Counter-Strike**\nPlaytime: `{playtime}`\nKills: `{kills}`\nDeaths: `{deaths}`\nK/D: `{kd}`\nWins: `{wins}`\nMVPs: `{mvps}`\nAccuracy: `{accuracy}`\nHeadshots: `{headshots}`', rows: 14 },
 { key: 'missingKeyMessage', label: 'Missing API Key', fallback: 'Set a Steam Web API key in this node to show Counter-Strike stats. Steam XML profile info can still work without it.', rows: 2 },
 { key: 'invalidSteamIdMessage', label: 'Invalid SteamID', fallback: 'Use `{command} <steamid64>` or `{command} https://steamcommunity.com/profiles/STEAM_ID/?xml=1`.', rows: 2 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Steam profile or Counter-Strike stats found for `{query}`. The profile or game stats may be private.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Counter-Strike profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Steam', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#F59E0B' }}>{'{steam_name} {steam_id} {playtime} {kills} {deaths} {kd}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{wins} {mvps} {accuracy} {headshots} {profile_link} {error}'}</span>
 </span>
 </>
 )}

 {type === 'game_pubg_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F2A900">PUBG Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="pubgprofile,bgprofile,battlegrounds" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">PUBG API Key</span>
 <input className="bl-node-input" value={data.apiKey || ''} onChange={(e) => update('apiKey', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Paste developer.pubg.com API key" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Platform</span>
 <select className="bl-node-input nodrag nowheel" value={data.platform || 'steam'} onChange={(e) => update('platform', e.target.value)} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
 <option value="steam">Steam</option>
 <option value="kakao">Kakao</option>
 <option value="psn">PSN</option>
 <option value="xbox">Xbox</option>
 <option value="console">Console</option>
 </select>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Game Mode</span>
 <select className="bl-node-input nodrag nowheel" value={data.gameMode || 'squad-fpp'} onChange={(e) => update('gameMode', e.target.value)} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
 <option value="solo">Solo</option>
 <option value="solo-fpp">Solo FPP</option>
 <option value="duo">Duo</option>
 <option value="duo-fpp">Duo FPP</option>
 <option value="squad">Squad</option>
 <option value="squad-fpp">Squad FPP</option>
 </select>
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'PUBG profile for {pubg_name}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Account**\nName: `{pubg_name}`\nAccount ID: `{account_id}`\nPlatform: `{platform}`\nShard: `{shard}`\nRecent Matches: `{recent_matches}`\n\n**Lifetime Stats ({game_mode})**\nRounds: `{rounds}`\nWins: `{wins}`\nTop 10s: `{top10s}`\nKills: `{kills}`\nDeaths: `{deaths}`\nK/D: `{kd}`\nDamage: `{damage}`\nLongest Kill: `{longest_kill}`\n\n**Links**\nProfile: {profile_link}', rows: 17 },
 { key: 'missingKeyMessage', label: 'Missing API Key', fallback: 'Set a PUBG API key in this node before using `{command}`.', rows: 2 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No PUBG profile found for `{query}` on `{platform}`.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load PUBG profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Profile', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#F2A900' }}>{'{pubg_name} {account_id} {platform} {game_mode} {wins} {kills}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{kd} {damage} {longest_kill} {profile_link} {error}'}</span>
 </span>
 </>
 )}

 {type === 'game_genshin_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#67E8F9">Genshin Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="gprofile,genshinprofile,gi" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">API Base</span>
 <input className="bl-node-input" value={data.apiBase || 'https://enka.network/api/uid'} onChange={(e) => update('apiBase', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="https://enka.network/api/uid" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">User-Agent</span>
 <input className="bl-node-input" value={data.userAgent || 'DiscordBotBuilder/1.0 contact: owner'} onChange={(e) => update('userAgent', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="DiscordBotBuilder/1.0 contact: owner" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Name to UID Map</span>
 <textarea className="bl-node-textarea" value={data.nameMap || 'Akash=618285856\nLumine=618285856'} onChange={(e) => update('nameMap', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={3} spellCheck={false} />
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Genshin profile for {nickname}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Traveler**\nNickname: `{nickname}`\nUID: `{uid}`\nAdventure Rank: `{level}`\nWorld Level: `{world_level}`\nSignature: {signature}\n\n**Progress**\nAchievements: `{achievements}`\nAbyss: `{abyss}`\nShowcase Characters: `{showcase_count}`\nNamecard ID: `{namecard_id}`\nProfile Icon ID: `{profile_icon_id}`\n\n**Links**\nProfile: {profile_link}', rows: 15 },
 { key: 'invalidUidMessage', label: 'Invalid UID', fallback: 'Use `{command} <genshin uid>` to check a Genshin profile.', rows: 2 },
 { key: 'nameNotMappedMessage', label: 'Name Not Mapped', fallback: 'No UID saved for `{query}`. Add it in the Genshin Profile node name map like `Name=UID`.', rows: 2 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Genshin profile found for UID `{query}`. The UID may be wrong or unavailable.', rows: 2 },
 { key: 'rateLimitMessage', label: 'Rate Limited', fallback: 'Genshin profile lookup is rate limited right now. Try again later.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Genshin profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Enka', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#67E8F9' }}>{'{nickname} {input_name} {uid} {level} {world_level} {signature}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{abyss} {showcase_count} {namecard_id} {profile_link} {error}'}</span>
 </span>
 </>
 )}

 {type === 'game_phasmophobia_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#A3E635">Phasmophobia Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="phasmo,phasmoprofile,phprofile" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Steam API Key</span>
 <input className="bl-node-input" value={data.apiKey || ''} onChange={(e) => update('apiKey', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Optional Steam Web API key" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Steam App ID</span>
 <input className="bl-node-input" value={data.appId || '739630'} onChange={(e) => update('appId', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="739630" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Manual Stats Map</span>
 <textarea className="bl-node-textarea" value={data.statMap || 'Akash=Level 84|Prestige 2|Sunny Meadows|Demon|Professional\nHunter=Level 42|Prestige 1|Tanglewood|Mimic|Intermediate'} onChange={(e) => update('statMap', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={4} spellCheck={false} />
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Phasmophobia profile for {steam_name}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Steam**\nSteamID: `{steam_id}`\nStatus: `{persona_state}`\nProfile: {profile_link}\n\n**Phasmophobia**\nPlaytime: `{playtime}`\nAchievements: `{achievements}`\nPerfect Games: `{perfect_games}`\nLevel: `{phasmo_level}`\nPrestige: `{prestige}`\nFavorite Map: `{favorite_map}`\nFavorite Ghost: `{favorite_ghost}`\nDifficulty: `{difficulty}`', rows: 14 },
 { key: 'invalidSteamIdMessage', label: 'Invalid SteamID', fallback: 'Use `{command} <steamid64>` or `{command} https://steamcommunity.com/profiles/STEAM_ID/?xml=1`.', rows: 2 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Steam profile found for `{query}`.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Phasmophobia profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Steam', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#A3E635' }}>{'{steam_name} {steam_id} {playtime} {achievements} {phasmo_level}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{prestige} {favorite_map} {favorite_ghost} {difficulty} {profile_link}'}</span>
 </span>
 </>
 )}

 {type === 'game_steam_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#66C0F4">Steam Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="steamprofile,steamuser,st" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Steam API Key</span>
 <input className="bl-node-input" value={data.apiKey || ''} onChange={(e) => update('apiKey', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Optional Steam Web API key" spellCheck={false} />
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Steam profile for {steam_name}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Profile**\nSteamID: `{steam_id}`\nVisibility: `{visibility}`\nStatus: `{persona_state}`\nCountry: `{country}`\nCreated: `{created_at}`\nLast Online: `{last_online}`\n\n**Library**\nGames: `{game_count}`\nTotal Playtime: `{total_playtime}`\nRecently Played: `{recent_games}`\n\n**Links**\nProfile: {profile_link}', rows: 14 },
 { key: 'invalidSteamIdMessage', label: 'Invalid SteamID', fallback: 'Use `{command} <steamid64>` or `{command} https://steamcommunity.com/profiles/STEAM_ID/?xml=1`.', rows: 2 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Steam profile found for `{query}`.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Steam profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Steam', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#66C0F4' }}>{'{steam_name} {steam_id} {visibility} {persona_state} {country}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{created_at} {game_count} {total_playtime} {recent_games} {profile_link}'}</span>
 </span>
 </>
 )}

 {type === 'game_epicgames_profile' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#D1D5DB">Epic Games Profile</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Aliases</span>
 <input className="bl-node-input" value={data.aliases || ''} onChange={(e) => update('aliases', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="epic,egs,epicprofile" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Lookup URL Template</span>
 <input className="bl-node-input" value={data.lookupUrlTemplate || ''} onChange={(e) => update('lookupUrlTemplate', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="https://example.com/api/lookup/{query}" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">API Key</span>
 <input className="bl-node-input" value={data.apiKey || ''} onChange={(e) => update('apiKey', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Optional lookup API key" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">API Key Header</span>
 <input className="bl-node-input" value={data.apiKeyHeader || 'Authorization'} onChange={(e) => update('apiKeyHeader', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Authorization" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Profile Map</span>
 <textarea className="bl-node-textarea" value={data.profileMap || 'Akash=Akashsuu|epic-00000000000000000000000000000000|India|PC, PlayStation|Public|AKASH|Fortnite, Rocket League\nHunter=GhostHunter|epic-11111111111111111111111111111111|United States|PC, Xbox|Friends Only|HUNTER|Fall Guys, Rocket League'} onChange={(e) => update('profileMap', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={4} spellCheck={false} />
 </div>
 {[
 { key: 'titleTemplate', label: 'Title', fallback: 'Epic Games profile for {epic_name}', rows: 1 },
 { key: 'descriptionTemplate', label: 'Description', fallback: '**Account**\nDisplay Name: `{epic_name}`\nAccount ID: `{account_id}`\nCountry: `{country}`\nPrivacy: `{privacy}`\nCreator Code: `{creator_code}`\n\n**Linked Platforms**\n{linked_platforms}\n\n**Games**\n{games}\n\n**Links**\nProfile: {profile_link}', rows: 13 },
 { key: 'notFoundMessage', label: 'Not Found', fallback: 'No Epic Games profile saved or found for `{query}`. Add it in the Epic Games Profile node map.', rows: 2 },
 { key: 'errorMessage', label: 'Error Message', fallback: 'Could not load Epic Games profile: {error}', rows: 2 },
 { key: 'profileLinkLabel', label: 'Profile Link Label', fallback: 'Open Epic', rows: 1 },
 ].map(({ key, label, fallback, rows }) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{label}</span>
 <textarea className="bl-node-textarea" value={data[key] ?? fallback} onChange={(e) => update(key, e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} rows={rows} spellCheck={false} />
 </div>
 ))}
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#D1D5DB' }}>{'{epic_name} {account_id} {country} {privacy} {creator_code}'}</span>
 {' '}
 <span style={{ color: '#888' }}>{'{linked_platforms} {games} {profile_link} {error}'}</span>
 </span>
 </>
 )}

 {type === 'ticket_panel' && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color="#F59E0B">Ticket Buttons</SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Panel Mode</span>
 <select
 className="bl-node-input nodrag nowheel"
 value={data.panelMode || 'buttons'}
 onChange={(e) => update('panelMode', e.target.value)}
 onPointerDown={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 >
 <option value="buttons">Buttons</option>
 <option value="dropdown">Dropdown</option>
 </select>
 </div>
 <div style={{ display: 'grid', gap: 6 }}>
 {ticketOptions.map((option, index) => (
 <div
 key={`${option.category}_${index}`}
 style={{
 display: 'grid',
 gridTemplateColumns: '1fr 1fr 28px',
 gap: 6,
 alignItems: 'center',
 background: '#171720',
 border: '1px solid #2A2A3A',
 borderRadius: 5,
 padding: 6,
 }}
 >
 <input
 className="bl-node-input"
 value={option.label}
 onChange={(e) => updateTicketOption(index, { label: e.target.value })}
 onPointerDown={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={data.panelMode === 'dropdown' ? 'Option label' : 'Button label'}
 spellCheck={false}
 style={{ minWidth: 0 }}
 />
 <input
 className="bl-node-input"
 value={option.category}
 onChange={(e) => updateTicketOption(index, { category: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })}
 onPointerDown={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="category_id"
 spellCheck={false}
 style={{ minWidth: 0 }}
 />
 <button
 type="button"
 onClick={(e) => removeTicketOption(index, e)}
 onPointerDown={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 title="Delete button"
 style={{ width: 28, height: 28, borderRadius: 4, border: '1px solid #5A2020', background: '#331015', color: '#FF7070', cursor: 'pointer', fontWeight: 800 }}
 >
 x
 </button>
 </div>
 ))}
 </div>
 <button
 type="button"
 onClick={addTicketOption}
 onPointerDown={(e) => e.stopPropagation()}
 onMouseDown={(e) => e.stopPropagation()}
 style={{ width: '100%', background: '#132116', border: '1px solid #245332', color: '#7BE395', borderRadius: 5, cursor: 'pointer', padding: '7px 0', fontSize: 11, marginTop: 7, fontWeight: 700 }}
 >
 Add {data.panelMode === 'dropdown' ? 'Option' : 'Button'}
 </button>
 <span className="bl-field-hint">Edit description and preview in the right properties panel.</span>
 </>
 )}

 {isTicketStatusNode && (
 <>
 <div className="bl-node-divider" />
 <SectionHead color={type === 'ticket_lock' ? '#F59E0B' : '#34D399'}>
 {type === 'ticket_lock' ? 'Lock Message' : 'Unlock Message'}
 </SectionHead>
 <div className="bl-field">
 <span className="bl-field-lbl">Text</span>
 <textarea
 className="bl-node-textarea"
 value={data[ticketStatusMessageKey] ?? ticketStatusDefaultMessage}
 onChange={(e) => update(ticketStatusMessageKey, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 rows={3}
 spellCheck={false}
 />
 <span className="bl-field-hint">{'{user}'} {'{mention}'} {'{ticketId}'} {'{channel}'}</span>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Channel Log ID</span>
 <input
 className="bl-node-input"
 value={data.logChannel || ''}
 onChange={(e) => update('logChannel', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Channel ID, #mention, or saved log channel"
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Support Roles</span>
 <input
 className="bl-node-input"
 value={data.supportRoles || ''}
 onChange={(e) => update('supportRoles', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Role IDs, comma separated"
 spellCheck={false}
 />
 </div>
 </>
 )}

 {configFields.length > 0 && <div className="bl-node-divider" />}
 {configFields.map(([key, val]) => (
 <div key={key} className="bl-field">
 <span className="bl-field-lbl">{key}</span>
 {typeof val === 'boolean' ? (
 <label className="bl-embed-toggle" style={{ fontSize: 11 }}>
 <input
 type="checkbox"
 checked={!!val}
 onChange={(e) => update(key, e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Enabled
 </label>
 ) : (
 <input
 className="bl-node-input"
 value={val ?? ''}
 onChange={(e) => update(key, typeof val === 'number' ? Number(e.target.value) : e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 type={typeof val === 'number' ? 'number' : 'text'}
 spellCheck={false}
 />
 )}
 </div>
 ))}

 {/* -- Output message template (for non-page plugins) ------------- */}
 {hasOutput && type !== 'util_serverinfo' && (
 <>
 <div className="bl-node-divider" />
 <div className="bl-field">
 <span className="bl-field-lbl" style={{ color: '#6AAA4A' }}>Output Message</span>
 <textarea
 className="bl-node-textarea"
 style={{ borderColor: '#2A4A1A', minHeight: 48 }}
 value={data.output || ''}
 onChange={(e) => update('output', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 spellCheck={false}
 rows={3}
 />
 <span className="bl-field-hint" style={{ lineHeight: 1.7 }}>
 <span style={{ color: '#7EB8F7' }}>{'{user} {tag} {mention}'}</span>{' - '}
 <span style={{ color: '#E07070' }}>{'{target} {targetName}'}</span>{' - '}
 <span style={{ color: '#A8D08D' }}>{'{reason} {command} {args}'}</span>{' - '}
 <span style={{ color: '#C8A0F0' }}>{'{server} {channel}'}</span>{' - '}
 <span style={{ color: '#888' }}>{'{date} {time}'}</span>
 </span>
 </div>
 {previewText && (
 <div className="bl-out-preview">
 <div className="bl-out-preview-lbl">Output preview</div>
 {previewText}
 </div>
 )}
 </>
 )}

 {/* --------------------------------------------------------------
 SERVER INFO - editable embed section templates
 -------------------------------------------------------------- */}
 {type === 'util_serverinfo' && (() => {
 const SI_FIELDS = [
 { key: 'embedTitle', label: ' Embed Title', hint: '{server}' },
 { key: 'ownerTemplate', label: 'Owner Owner', hint: '{ownerMention} {owner} {ownerId}' },
 { key: 'serverIdTemplate', label: 'ID Server ID', hint: '{serverId}' },
 { key: 'createdTemplate', label: 'Created Created', hint: '{createdAt} {createdTimestamp}' },
 { key: 'membersTemplate', label: 'Members Members', hint: '{memberCount} {humanCount} {botCount}' },
 { key: 'channelsTemplate', label: 'Channels Channels', hint: '{textChannels} {voiceChannels} {categories}' },
 { key: 'rolesTemplate', label: 'Roles Roles', hint: '{roles}' },
 { key: 'boostTemplate', label: 'Boost Boost', hint: '{boostTier} {boostBar} {boostCount}' },
 { key: 'verificationTemplate',label: 'Lock Verification', hint: '{verification}' },
 { key: 'embedFooter', label: 'Footer Footer', hint: '{serverId} {server} {user}' },
 ];
 return (
 <>
 <div className="bl-node-divider" style={{ borderColor: '#1A3A5A' }} />
 <div className="bl-field">
 <SectionHead color="#7EB8F7"> Server Info Sections</SectionHead>
 </div>
 <div className="nowheel" style={{ maxHeight: 480, overflowY: 'auto' }}>
 {SI_FIELDS.map(({ key, label, hint }) => (
 <div key={key} style={{ marginBottom: 8 }}>
 <span style={{ color: '#9AAFBF', fontSize: 10, fontWeight: 600, display: 'block', marginBottom: 3 }}>
 {label}
 </span>
 <textarea
 className="bl-node-textarea"
 value={data[key] || ''}
 onChange={(e) => update(key, e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder={hint}
 spellCheck={false}
 rows={key === 'embedTitle' || key === 'embedFooter' ? 1 : 3}
 style={{ fontSize: 11, minHeight: key === 'embedTitle' || key === 'embedFooter' ? 28 : 52 }}
 />
 </div>
 ))}
 </div>
 <div style={{ color: '#3A5A7A', fontSize: 10, padding: '2px 0 4px', lineHeight: 1.6 }}>
 <span style={{ color: '#7EB8F7' }}>{'{server} {serverId} {memberCount}'}</span>
 {' - '}
 <span style={{ color: '#A8D08D' }}>{'{owner} {ownerMention} {ownerId}'}</span>
 {' - '}
 <span style={{ color: '#C8A0F0' }}>{'{roles} {verification} {createdAt}'}</span>
 </div>

 {/* -- Live Discord preview -- */}
 <div className="bl-node-divider" style={{ borderColor: '#1A3A5A' }} />
 <div className="bl-field">
 <SectionHead color="#72767D">Preview Discord Preview</SectionHead>
 </div>
 <DiscordPreviewServerInfo data={data} />
 </>
 );
 })()}



 {/* -- DM target -------------------------------------------------- */}
 {'dmEnabled' in data && (
 <>
 <div className="bl-node-divider" />
 <div className="bl-field">
 <label className="bl-embed-toggle">
 <input type="checkbox" checked={!!data.dmEnabled} onChange={(e) => update('dmEnabled', e.target.checked)} />
 DM Target
 </label>
 </div>
 {data.dmEnabled && (
 <div className="bl-field">
 <span className="bl-field-lbl">DM Message</span>
 <textarea
 className="bl-node-textarea"
 style={{ minHeight: 44 }}
 value={data.dmMessage || ''}
 onChange={(e) => update('dmMessage', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 spellCheck={false}
 rows={2}
 />
 </div>
 )}
 </>
 )}

 {/* --------------------------------------------------------------
 PAGES EDITOR + INLINE DISCORD PREVIEW
 -------------------------------------------------------------- */}
 {hasPages && (
 <>
 <div className="bl-node-divider" style={{ borderColor: '#2A2A4A' }} />

 {/* SAFE ARRAY */}
 {(!data.pages || data.pages.length === 0) && (
 <p style={{ color: '#555', fontSize: 11, padding: '2px 0 4px', textAlign: 'center' }}>No pages yet</p>
 )}

 <div className="nowheel" style={{ maxHeight: 420, overflowY: 'auto' }}>
 {(data.pages || []).map((page, i) => {
 const pages = data.pages || [];

 return (
 <div key={page.id || i} style={{
 border: "1px solid #333",
 padding: "10px",
 marginBottom: "10px",
 borderRadius: "6px",
 background: '#16162A'
 }}>

 <strong style={{ display: 'block', marginBottom: 5, color: '#C8A0F0' }}>Page {i + 1}</strong>

 {/* TITLE */}
 <input
 className="bl-node-input"
 value={page.title || ""}
 placeholder="Page Title"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 onChange={(e) => {
 const newPages = [...pages];
 newPages[i] = { ...newPages[i], title: e.target.value };
 updatePages(newPages);
 }}
 style={{ width: '100%', marginBottom: 5 }}
 />

 {/* DESCRIPTION */}
 <input
 className="bl-node-input"
 value={page.description || ""}
 placeholder="Dropdown Description (Optional)"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 onChange={(e) => {
 const newPages = [...pages];
 newPages[i] = { ...newPages[i], description: e.target.value };
 updatePages(newPages);
 }}
 style={{ width: '100%', marginBottom: 5, fontSize: 10 }}
 />

 {/* CONTENT */}
 <textarea
 className="bl-node-textarea"
 value={page.content || ""}
 placeholder="Page Content"
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 onFocus={() => setPreviewPg && setPreviewPg(i)}
 onChange={(e) => {
 const newPages = [...pages];
 newPages[i] = { ...newPages[i], content: e.target.value };
 updatePages(newPages);
 }}
 style={{ width: '100%', minHeight: 52, marginBottom: 5 }}
 />

 {/* ACTIONS */}
 <div style={{ marginTop: 5, display: 'flex', gap: 5 }}>

 <button
 disabled={i === 0}
 onClick={() => {
 if (i === 0) return;
 const newPages = [...pages];
 [newPages[i - 1], newPages[i]] = [newPages[i], newPages[i - 1]];
 updatePages(newPages);
 setPreviewPg(i - 1);
 }}
 onMouseDown={(e) => e.stopPropagation()}
 style={{
 background: '#2A2A3A', border: '1px solid #4A4A5A', color: i === 0 ? '#555' : '#DCDDDE',
 padding: '2px 8px', borderRadius: 3, cursor: i === 0 ? 'default' : 'pointer'
 }}
 >
 ^
 </button>

 <button
 disabled={i === pages.length - 1}
 onClick={() => {
 if (i === pages.length - 1) return;
 const newPages = [...pages];
 [newPages[i + 1], newPages[i]] = [newPages[i], newPages[i + 1]];
 updatePages(newPages);
 setPreviewPg(i + 1);
 }}
 onMouseDown={(e) => e.stopPropagation()}
 style={{
 background: '#2A2A3A', border: '1px solid #4A4A5A', color: i === pages.length - 1 ? '#555' : '#DCDDDE',
 padding: '2px 8px', borderRadius: 3, cursor: i === pages.length - 1 ? 'default' : 'pointer'
 }}
 >
 v
 </button>

 <button
 onClick={() => {
 const newPages = [...pages];
 newPages.splice(i, 1);
 updatePages(newPages);
 setPreviewPg((p) => Math.max(0, p - (p >= i ? 1 : 0)));
 }}
 onMouseDown={(e) => e.stopPropagation()}
 style={{
 background: '#3A1010', border: '1px solid #5A2020', color: '#FF7070',
 padding: '2px 8px', borderRadius: 3, cursor: 'pointer', marginLeft: 'auto'
 }}
 >
 X
 </button>

 </div>
 </div>
 );
 })}
 </div>

 {/* ADD PAGE */}
 <button
 onClick={() => {
 const pages = data.pages || [];
 const newPages = [
 ...pages,
 {
 id: `page_${Date.now()}_${Math.random().toString(36).slice(2,5)}`,
 title: "New Page",
 content: ""
 }
 ];
 updatePages(newPages);
 }}
 onMouseDown={(e) => e.stopPropagation()}
 style={{
 width: '100%', background: '#1A2A1A',
 border: '1px solid #2A4A2A', color: '#6AAA4A',
 borderRadius: 4, cursor: 'pointer',
 padding: '5px 0', fontSize: 11, marginBottom: 6,
 }}
 >
 + Add Page
 </button>

 {/* -- Inline Discord preview -------------------------------- */}
 {pgs.length > 0 && (
 <>
 <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
 <span style={{ color: '#555', fontSize: 10, flexShrink: 0 }}>Preview Preview</span>
 <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', flex: 1 }}>
 {pgs.map((p, i) => (
 <button
 key={i}
 onClick={() => setPreviewPg(i)}
 onMouseDown={(e) => e.stopPropagation()}
 title={p.title || `Page ${i + 1}`}
 style={{
 background: safePg === i ? '#2A2A5A' : '#1A1A2A',
 border: `1px solid ${safePg === i ? '#5865F2' : '#2A2A3A'}`,
 color: safePg === i ? '#7EB8F7' : '#555',
 borderRadius: 3, cursor: 'pointer',
 padding: '1px 7px', fontSize: 10, fontWeight: safePg === i ? 700 : 400,
 }}
 >
 {i + 1}
 </button>
 ))}
 </div>
 </div>
 <DiscordPreviewInline pages={pgs} pageIdx={safePg} data={data} />
 </>
 )}
 </>
 )}

 {/* --------------------------------------------------------------
 DROPDOWN MENU
 -------------------------------------------------------------- */}
 {hasDropdown && (
 <>
 <div className="bl-node-divider" style={{ borderColor: '#2A3A2A' }} />
 <div className="bl-field">
 <label className="bl-embed-toggle">
 <input
 type="checkbox"
 checked={!!dd.enabled}
 onChange={(e) => updateDropdown('enabled', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 <SectionHead color="#6AAA4A">v Dropdown Menu</SectionHead>
 </label>
 </div>

 {dd.enabled && (
 <>
 <div className="bl-field">
 <span className="bl-field-lbl">Placeholder</span>
 <input
 className="bl-node-input"
 value={dd.placeholder || ''}
 onChange={(e) => updateDropdown('placeholder', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Select a page..."
 spellCheck={false}
 />
 </div>
 <div className="bl-field">
 <label className="bl-embed-toggle" style={{ fontSize: 11 }}>
 <input
 type="checkbox"
 checked={dd.usePages !== false}
 onChange={(e) => updateDropdown('usePages', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Auto-generate options from Pages
 </label>
 </div>

 {/* Preview of dropdown options */}
 {dd.usePages && pgs.length > 0 && (
 <div style={{ background: '#1A1A2A', border: '1px solid #2A2A3A', borderRadius: 4, padding: '4px 6px', marginTop: 2 }}>
 {pgs.slice(0, 5).map((p, i) => (
 <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 0', fontSize: 10 }}>
 <span style={{ color: '#555' }}>></span>
 <span style={{ color: '#DCDDDE' }}>{p.title || `Page ${i + 1}`}</span>
 </div>
 ))}
 {pgs.length > 5 && (
 <div style={{ color: '#555', fontSize: 10, paddingTop: 2 }}>+{pgs.length - 5} more...</div>
 )}
 </div>
 )}
 </>
 )}
 </>
 )}

 {/* --------------------------------------------------------------
 BUTTON ROW
 -------------------------------------------------------------- */}
 {hasButtons && (
 <>
 <div className="bl-node-divider" style={{ borderColor: '#2A2A3A' }} />
 <div className="bl-field">
 <label className="bl-embed-toggle">
 <input
 type="checkbox"
 checked={!!bt.enabled}
 onChange={(e) => updateButtons('enabled', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 <SectionHead color="#7EB8F7"># Button Row</SectionHead>
 </label>
 </div>

 {bt.enabled && (
 <>
 <div className="bl-field">
 <label className="bl-embed-toggle" style={{ fontSize: 11 }}>
 <input
 type="checkbox"
 checked={bt.navigation !== false}
 onChange={(e) => updateButtons('navigation', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Navigation Buttons
 </label>
 </div>

 {/* Button preview */}
 {bt.navigation !== false && (
 <div style={{ display: 'flex', gap: 4, padding: '3px 0 2px' }}>
 {[
 { lbl: '<- Prev', bg: '#2A2A3A', border: '#3A3A4A', col: '#DCDDDE' },
 { lbl: 'Next ->', bg: '#1A2A4A', border: '#2A3A5A', col: '#7EB8F7' },
 { lbl: 'X Close', bg: '#3A1A1A', border: '#5A2A2A', col: '#FF7070' },
 ].map(({ lbl, bg, border, col }) => (
 <span
 key={lbl}
 style={{
 flex: 1, textAlign: 'center', fontSize: 10,
 background: bg, border: `1px solid ${border}`,
 borderRadius: 3, padding: '3px 0', color: col,
 }}
 >{lbl}</span>
 ))}
 </div>
 )}
 </>
 )}
 </>
 )}

 {/* --------------------------------------------------------------
 EMBED SECTION
 -------------------------------------------------------------- */}
 <div className="bl-node-divider" />
 <div className="bl-field">
 <label className="bl-embed-toggle">
 <input
 type="checkbox"
 checked={data.embedEnabled !== false}
 onChange={(e) => update('embedEnabled', e.target.checked)}
 onMouseDown={(e) => e.stopPropagation()}
 />
 Embed Output
 </label>
 </div>

 {data.embedEnabled !== false && (
 <>
 <div className="bl-field">
 <span className="bl-field-lbl">Color</span>
 <div className="bl-color-field">
 <input type="color" className="bl-color-pick" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} />
 <input type="text" className="bl-node-input" value={data.embedColor || '#5865F2'} onChange={(e) => update('embedColor', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} spellCheck={false} style={{ flex: 1 }} />
 </div>
 </div>

 <div className="bl-field">
 <span className="bl-field-lbl">Footer</span>
 <input
 className="bl-node-input"
 value={data.embedFooter || ''}
 onChange={(e) => update('embedFooter', e.target.value)}
 onMouseDown={(e) => e.stopPropagation()}
 onClick={(e) => e.stopPropagation()}
 onKeyDown={(e) => e.stopPropagation()}
 placeholder="Footer text... {page} of {totalPages}"
 spellCheck={false}
 />
 </div>

 <div className="bl-node-divider" style={{ borderColor: '#2A3A4A' }} />
 <div className="bl-field">
 <span className="bl-field-lbl" style={{ color: '#4A8ACA' }}>^ Logo (top-left)</span>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Logo URL</span>
 <input className="bl-node-input" value={data.logoUrl || ''} onChange={(e) => update('logoUrl', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="https://...icon.png" spellCheck={false} />
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Logo Name</span>
 <input className="bl-node-input" value={data.logoName || ''} onChange={(e) => update('logoName', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="Bot name" spellCheck={false} />
 </div>

 <div className="bl-node-divider" style={{ borderColor: '#2A3A4A' }} />
 <div className="bl-field">
 <span className="bl-field-lbl" style={{ color: '#4A8ACA' }}>- Image (bottom)</span>
 </div>
 <div className="bl-field">
 <span className="bl-field-lbl">Image URL</span>
 <input className="bl-node-input" value={data.imageUrl || ''} onChange={(e) => update('imageUrl', e.target.value)} onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} placeholder="https://...image.png" spellCheck={false} />
 </div>
 </>
 )}

 {/* -- Pass-through output socket ------------------------------ */}
 {data._hasOutput && (
 <>
 <div className="bl-node-divider" />
 <div className="bl-row bl-row-out">
 <span className="bl-socket-label">Pass-through</span>
 <Handle type="source" position={Position.Right} id="output" className="handle-yellow" />
 </div>
 </>
 )}
 </div>
 )}
 </div>
 );
}
