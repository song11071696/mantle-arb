/**
 * Logging utility with levels and structured output
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const COLORS = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  reset: '\x1b[0m',
};

class Logger {
  constructor(context = 'app', level = 'info') {
    this.context = context;
    this.level = LOG_LEVELS[level] ?? LOG_LEVELS.info;
    this.logs = [];
  }

  _log(level, message, data = null) {
    if (LOG_LEVELS[level] < this.level) return;
    const ts = new Date().toISOString();
    const entry = { ts, level, context: this.context, message, data };
    this.logs.push(entry);
    const color = COLORS[level] || '';
    const reset = COLORS.reset;
    const line = `${color}[${ts}] [${level.toUpperCase()}] [${this.context}] ${message}${reset}`;
    console.log(line);
    if (data) console.log(data);
  }

  debug(msg, data) { this._log('debug', msg, data); }
  info(msg, data) { this._log('info', msg, data); }
  warn(msg, data) { this._log('warn', msg, data); }
  error(msg, data) { this._log('error', msg, data); }

  child(context) {
    return new Logger(`${this.context}:${context}`, Object.keys(LOG_LEVELS)[this.level]);
  }

  getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }
}

const logger = new Logger('mantle-arb', process.env.LOG_LEVEL || 'info');

module.exports = { Logger, logger };
