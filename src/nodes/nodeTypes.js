import EventMessageNode  from './EventMessageNode';
import EventChannelNode  from './EventChannelNode';
import EventClientNode   from './EventClientNode';
import EventEmojiNode    from './EventEmojiNode';
import EventGuildNode    from './EventGuildNode';
import EventMemberNode   from './EventMemberNode';
import EventRoleNode     from './EventRoleNode';
import CustomCommandNode from './CustomCommandNode';
import SendMessageNode   from './SendMessageNode';
import ConditionBranchNode from './ConditionBranchNode';
import PluginNode        from './PluginNode';

// Defined outside any component so React Flow never sees a new reference
const nodeTypes = {
  event_message:    EventMessageNode,
  event_channel:    EventChannelNode,
  event_client:     EventClientNode,
  event_emoji:      EventEmojiNode,
  event_guild:      EventGuildNode,
  event_member:     EventMemberNode,
  event_role:       EventRoleNode,
  custom_command:   CustomCommandNode,
  send_message:     SendMessageNode,
  condition_branch: ConditionBranchNode,
  page_menu:        PluginNode,
};

export default nodeTypes;

export const NODE_PALETTE = [
  {
    type: 'page_menu',
    label: 'Page Menu',
    icon: '📖',
    color: '#D35400',
    description: 'Multi-page embed with optional dropdown & buttons',
  },
  {
    type: 'event_message',
    label: 'Message Event',
    icon: '⚡',
    color: '#9b59b6',
    description: 'Triggered on every Discord message',
  },
  {
    type: 'event_channel',
    label: 'Channel Event',
    icon: '📢',
    color: '#2980b9',
    description: 'Triggered on channel create/delete/update',
  },
  {
    type: 'event_client',
    label: 'Client Event',
    icon: '🤖',
    color: '#7d3c98',
    description: 'Triggered on bot client events (ready, warn)',
  },
  {
    type: 'event_emoji',
    label: 'Emoji Event',
    icon: '😀',
    color: '#ca6f1e',
    description: 'Triggered on emoji create/delete/update',
  },
  {
    type: 'event_guild',
    label: 'Guild Event',
    icon: '🏰',
    color: '#1e8449',
    description: 'Triggered on guild join/leave/update',
  },
  {
    type: 'event_member',
    label: 'Member Event',
    icon: '👤',
    color: '#1a5276',
    description: 'Triggered on member join/leave/update',
  },
  {
    type: 'event_role',
    label: 'Role Event',
    icon: '🎭',
    color: '#922b21',
    description: 'Triggered on role create/delete/update',
  },
  {
    type: 'custom_command',
    label: 'Custom Command',
    icon: '💬',
    color: '#3498db',
    description: 'Match a command and optionally reply',
  },
  {
    type: 'send_message',
    label: 'Send Message',
    icon: '📤',
    color: '#2ecc71',
    description: 'Send a text message to the channel',
  },
  {
    type: 'condition_branch',
    label: 'Condition Branch',
    icon: '🔀',
    color: '#e67e22',
    description: 'Branch based on message content',
  },
];

export const DEFAULT_NODE_DATA = {
  event_message:    { label: 'Message Event' },
  event_channel:    { label: 'Channel Event',  event: 'channelCreate' },
  event_client:     { label: 'Client Event',   event: 'ready' },
  event_emoji:      { label: 'Emoji Event',    event: 'emojiCreate' },
  event_guild:      { label: 'Guild Event',    event: 'guildCreate' },
  event_member:     { label: 'Member Event',   event: 'guildMemberAdd' },
  event_role:       { label: 'Role Event',     event: 'roleCreate' },
  custom_command: {
    label: 'Custom Command',
    command: '!hello',
    reply: 'Hello {user}!',
    apiEnabled: false,
    apiMethod: 'GET',
    apiUrl: 'https://api.example.com/search?q={args}',
    apiHeaders: 'Accept: application/json',
    apiBody: '',
    apiResultPath: 'message',
    apiReply: '{apiResult}',
    apiErrorMessage: 'API error: {apiError}',
    apiTimeout: 15000,
  },
  send_message:     { label: 'Send Message',   text: 'Hello {user}!' },
  condition_branch: { label: 'Condition Branch', condition: 'starts_with', value: '!test' },
  page_menu: {
    _label:       'Page Menu',
    _icon:        '📖',
    _color:       '#3A1E00',
    _hasInput:    true,
    _hasOutput:   true,
    embedEnabled: true,
    embedColor:   '#D35400',
    embedFooter:  'Page {page} of {totalPages}',
    logoUrl:      '',
    logoName:     '',
    imageUrl:     '',
    pages: [
      { id: 'page1', title: 'Page 1', content: 'Welcome, {user}! This is the first page.' },
      { id: 'page2', title: 'Page 2', content: 'Here is some more info, {user}.' },
      { id: 'page3', title: 'Page 3', content: 'That\'s everything! Thanks for reading.' },
    ],
    dropdown: { enabled: false, placeholder: 'Select a page…', usePages: true },
    buttons:  { enabled: true,  navigation: true, list: [] },
  },
};
