'use strict';

// WHY a custom logger instead of console.*:
// 1. Namespaced output so each subsystem is identifiable at a glance.
// 2. Listener hooks let the Electron main process forward log lines to the
// renderer's LogPanel without coupling logger to IPC code.
// 3. Level filtering keeps debug noise out of production.

const LEVELS = Object.freeze({ DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 });

class Logger {
 constructor(namespace, levelName = 'INFO') {
 this.namespace = namespace;
 this._level = LEVELS[levelName] - LEVELS.INFO;
 this._listeners = [];
 }

 _emit(levelName, message, meta = {}) {
 if ((LEVELS[levelName] - 0) < this._level) return;

 const entry = {
 timestamp: new Date().toISOString(),
 level: levelName,
 namespace: this.namespace,
 message,
 ...meta,
 };

 const line = `[${entry.timestamp}] [${levelName.padEnd(5)}] [${this.namespace}] ${message}`;
 if (levelName === 'ERROR') console.error(line);
 else if (levelName === 'WARN') console.warn(line);
 else console.log(line);

 // Notify listeners (e.g. IPC forwarder) — never let a listener crash the logger
 for (const fn of this._listeners) {
 try { fn(entry); } catch { /* swallow */ }
 }
 }

 debug(msg, meta = {}) { this._emit('DEBUG', msg, meta); }
 info (msg, meta = {}) { this._emit('INFO', msg, meta); }
 warn (msg, meta = {}) { this._emit('WARN', msg, meta); }
 error(msg, meta = {}) { this._emit('ERROR', msg, meta); }

 // Create a child logger that prefixes the namespace (e.g. 'Engine:PluginLoader')
 child(namespace) {
 const child = new Logger(`${this.namespace}:${namespace}`, Object.keys(LEVELS)[this._level]);
 // Share parent listeners so all log entries flow to a single sink
 child._listeners = this._listeners;
 return child;
 }

 // Register a log listener. Returns an unsubscribe function.
 onLog(fn) {
 this._listeners.push(fn);
 return () => { this._listeners = this._listeners.filter((f) => f !== fn); };
 }

 setLevel(levelName) {
 if (LEVELS[levelName] === undefined) throw new Error(`Unknown log level: ${levelName}`);
 this._level = LEVELS[levelName];
 }
}

// Singleton root logger — consumers call logger.child('MyModule')
module.exports = new Logger('Engine', process.env.LOG_LEVEL || 'INFO');
