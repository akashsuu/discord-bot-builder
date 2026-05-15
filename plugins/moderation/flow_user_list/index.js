'use strict';

module.exports = {
 meta: {
 name: 'Flow User List',
 version: '1.0.0',
 author: 'Akashsuu',
 description: 'Loads allowed user IDs into ctx.allowedUsers for downstream Permission Gate.',
 engineVersion: '>=1.0.0',
 },

 nodes: {
 flow_user_list: {
 label: 'User List',
 icon: '👥',
 color: '#1A3A4A',
 description: 'Populates ctx.allowedUsers with static user IDs. Always passes the flow.',
 inputs: [{ id: 'in', label: 'Trigger', type: 'flow' }],
 outputs: [{ id: 'out', label: 'Continue', type: 'flow' }],

 configSchema: {
 userIds: {
 type: 'string',
 default: '',
 required: false,
 description: 'Comma-separated Discord user IDs to allow',
 },
 mode: {
 type: 'string',
 default: 'add',
 enum: ['add', 'replace'],
 required: false,
 description: '"add" appends to existing set, "replace" clears first',
 },
 },

 async execute(node, message, ctx) {
 // Parse user IDs from node config (supports comma, space, or newline separation)
 const raw = String(node.data?.userIds || '');
 const ids = raw.split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^\d{17,20}$/.test(s));

 if (!(ctx.allowedUsers instanceof Set)) ctx.allowedUsers = new Set();

 if (node.data?.mode === 'replace') ctx.allowedUsers.clear();
 for (const id of ids) ctx.allowedUsers.add(id);

 // Always return true — this is a data node, not a filter
 return true;
 },

 generateCode(node) {
 const ids = String(node.data?.userIds || '').split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^\d{17,20}$/.test(s));
 const mode = node.data?.mode || 'add';
 const idsJson = JSON.stringify(ids);
 return `
// ── User List ────────────────────────────────────────────
${mode === 'replace' ? '_allowedUsers = new Set();' : ''}
if (!(_allowedUsers instanceof Set)) _allowedUsers = new Set();
${idsJson}.forEach((id) => _allowedUsers.add(id));`;
 },
 },
 },
};
