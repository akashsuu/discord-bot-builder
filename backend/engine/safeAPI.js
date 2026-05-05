'use strict';

// WHY a safeAPI / Proxy approach instead of passing the raw Discord client:
// The raw client exposes .token, .destroy(), ._events, and dozens of internal
// methods a plugin has no business touching. A Proxy intercepts every property
// access and enforces a strict whitelist — plugins that accidentally (or
// maliciously) access restricted props get a clear error, not silent access.
// We avoid the Node vm module because it is slow to initialise, adds complexity,
// and doesn't meaningfully sandbox native require() anyway. The Proxy approach
// is lightweight and sufficient for first-party plugin isolation.

// Properties plugins are allowed to read from the Discord client
const CLIENT_READABLE = new Set([
  'user', 'guilds', 'channels', 'users', 'emojis', 'stickers',
  'application', 'readyAt', 'uptime', 'ws', 'shard', 'options',
  'isReady', 'fetchGuild', 'fetchUser', 'fetchWebhook',
  'fetchGuildPreview', 'fetchInvite', 'fetchSticker', 'generateInvite',
]);

// Properties that must NEVER be accessible even if they sound harmless
const CLIENT_BLOCKED = new Set([
  'token', '_token', 'destroy', 'login', 'logout',
  '_events', '_eventsCount', '_maxListeners',
  'sweepers', 'rest',          // rest has raw HTTP with auth headers
]);

function createClientProxy(client) {
  return new Proxy(client, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string') return Reflect.get(target, prop, receiver);

      if (CLIENT_BLOCKED.has(prop)) {
        throw new Error(
          `[SafeAPI] Access to client.${prop} is restricted. ` +
          `Plugins must use the safeAPI surface only.`
        );
      }
      if (!CLIENT_READABLE.has(prop)) {
        // Return undefined for unknown props — silent block is intentional
        // so plugins don't crash but also can't probe for hidden properties.
        return undefined;
      }
      const val = Reflect.get(target, prop, receiver);
      return typeof val === 'function' ? val.bind(target) : val;
    },

    set(_target, prop) {
      throw new Error(`[SafeAPI] Modifying client.${String(prop)} is not allowed.`);
    },
    deleteProperty(_target, prop) {
      throw new Error(`[SafeAPI] Deleting client.${String(prop)} is not allowed.`);
    },
    // Prevent Object.keys / for..in enumeration of internal props
    ownKeys(target) {
      return [...CLIENT_READABLE].filter((k) => k in target);
    },
    has(target, prop) {
      return CLIENT_READABLE.has(prop) && prop in target;
    },
  });
}

// ── Utility helpers exposed to every plugin ───────────────────────────────────
const utils = Object.freeze({
  // sleep() caps at 30 s — prevents runaway async loops inside plugins
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, Math.min(ms, 30_000))),

  escapeMarkdown: (str) => String(str).replace(/([*_`~\\|>])/g, '\\$1'),

  truncate: (str, max = 2000) => {
    const s = String(str);
    return s.length > max ? s.slice(0, max - 3) + '…' : s;
  },

  parseArgs: (content, cmdLength) =>
    content.slice(cmdLength).trim().split(/\s+/).filter(Boolean),
});

// ── Public factory ────────────────────────────────────────────────────────────
function createSafeAPI(client, pluginLogger, pluginConfig = {}) {
  return Object.freeze({
    // Proxied Discord client — read-only, whitelisted surface
    client: createClientProxy(client),

    // Scoped logger so plugin log lines are identifiable in LogPanel
    log: Object.freeze({
      debug: (msg) => pluginLogger.debug(String(msg)),
      info:  (msg) => pluginLogger.info(String(msg)),
      warn:  (msg) => pluginLogger.warn(String(msg)),
      error: (msg) => pluginLogger.error(String(msg)),
    }),

    // Frozen shallow copy of config — plugins cannot mutate engine config
    config: Object.freeze({ ...pluginConfig }),

    utils,
  });
}

module.exports = { createSafeAPI, createClientProxy };
