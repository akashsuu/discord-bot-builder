import EventMessageNode from './EventMessageNode';
import CustomCommandNode from './CustomCommandNode';
import SendMessageNode from './SendMessageNode';
import ConditionBranchNode from './ConditionBranchNode';

// Defined outside any component so React Flow never sees a new reference
const nodeTypes = {
  event_message: EventMessageNode,
  custom_command: CustomCommandNode,
  send_message: SendMessageNode,
  condition_branch: ConditionBranchNode,
};

export default nodeTypes;

export const NODE_PALETTE = [
  {
    type: 'event_message',
    label: 'Message Event',
    icon: '⚡',
    color: '#9b59b6',
    description: 'Triggered on every Discord message',
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
  event_message: { label: 'Message Event' },
  custom_command: { label: 'Custom Command', command: '!hello', reply: 'Hello {user}!' },
  send_message: { label: 'Send Message', text: 'Hello {user}!' },
  condition_branch: { label: 'Condition Branch', condition: 'starts_with', value: '!test' },
};
