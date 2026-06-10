/**
 * RunnableBase - Abstract base class for long-running async components
 * (inspired by Hummingbot's RunnableBase)
 *
 * Provides:
 * - Unified lifecycle: start(), stop(), controlTask() loop
 * - Async task management with safe cancellation
 * - State machine: CREATED -> RUNNING -> STOPPING -> STOPPED
 * - Error isolation per tick
 */

const { EventEmitter } = require('events');
const { Logger } = require('../utils/logger');

/**
 * Component lifecycle states
 */
const RunState = {
  CREATED: 'created',
  RUNNING: 'running',
  STOPPING: 'stopping',
  STOPPED: 'stopped',
};

class RunnableBase extends EventEmitter {
  constructor(config = {}) {
    super();
    this.name = config.name || this.constructor.name;
    this.logger = config.logger || new Logger(this.name);
    this._state = RunState.CREATED;
    this._task = null; // main async task
    this._tickIntervalMs = config.tickIntervalMs || 1000;
    this._timer = null;
    this._tickCount = 0;
    this._lastTickTime = 0;
    this._tickErrors = 0;
    this._maxConsecutiveErrors = config.maxConsecutiveErrors || 10;
    this._startedAt = null;
    this._stoppedAt = null;
  }

  /**
   * Current lifecycle state
   */
  get state() {
    return this._state;
  }

  get isRunning() {
    return this._state === RunState.RUNNING;
  }

  /**
   * Start the component. Begins the controlTask loop.
   */
  async start() {
    if (this._state === RunState.RUNNING) {
      this.logger.warn(`${this.name} already running`);
      return;
    }

    this._state = RunState.RUNNING;
    this._startedAt = Date.now();
    this._stoppedAt = null;
    this._tickErrors = 0;
    this._tickCount = 0;

    this.logger.info(`${this.name} started`);
    this.emit('started');

    await this.onStart();

    // Begin tick loop
    this._timer = setInterval(async () => {
      await this._runTick();
    }, this._tickIntervalMs);
  }

  /**
   * Stop the component gracefully.
   * Waits for current tick to finish, then stops.
   */
  async stop() {
    if (this._state !== RunState.RUNNING) {
      this.logger.warn(`${this.name} not running`);
      return;
    }

    this._state = RunState.STOPPING;
    this.logger.info(`${this.name} stopping...`);

    // Clear the timer so no new ticks fire
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    await this.onStop();

    this._state = RunState.STOPPED;
    this._stoppedAt = Date.now();
    this.logger.info(`${this.name} stopped`);
    this.emit('stopped', this.getStatus());
  }

  /**
   * Execute a single tick of the control loop.
   * Override this in subclasses with the actual work.
   * @returns {Promise<any>} - tick result
   */
  async controlTask() {
    // Default: no-op. Subclasses override this.
  }

  /**
   * Hook called once when the component starts.
   * Override for initialization logic.
   */
  async onStart() {}

  /**
   * Hook called once when the component stops.
   * Override for cleanup logic.
   */
  async onStop() {}

  /**
   * Hook called on each tick before controlTask.
   * Can be used for pre-checks.
   * @returns {boolean} whether to proceed with this tick
   */
  async onTick() {
    return true;
  }

  /**
   * Internal tick runner with error isolation
   * @private
   */
  async _runTick() {
    if (this._state !== RunState.RUNNING) return;

    try {
      const shouldProceed = await this.onTick();
      if (!shouldProceed) return;

      this._tickCount++;
      this._lastTickTime = Date.now();

      await this.controlTask();

      // Reset error counter on success
      this._tickErrors = 0;
    } catch (err) {
      this._tickErrors++;
      this.logger.error(
        `${this.name} tick #${this._tickCount} error (${this._tickErrors}/${this._maxConsecutiveErrors}): ${err.message}`
      );
      this.emit('tickError', { error: err, tickCount: this._tickCount, consecutiveErrors: this._tickErrors });

      if (this._tickErrors >= this._maxConsecutiveErrors) {
        this.logger.error(`${this.name} too many consecutive errors, stopping`);
        this.emit('fatalError', { error: err, tickCount: this._tickCount });
        await this.stop();
      }
    }
  }

  /**
   * Run an async child task with lifecycle awareness.
   * The task is tracked and will be awaited on stop.
   * @param {string} name - task identifier
   * @param {Function} taskFn - async function to run
   * @returns {Promise}
   */
  async runTask(name, taskFn) {
    const task = {
      name,
      startedAt: Date.now(),
      done: false,
      error: null,
    };

    this._task = task;
    this.logger.debug(`Task started: ${name}`);
    this.emit('taskStarted', { name });

    try {
      const result = await taskFn();
      task.done = true;
      this.logger.debug(`Task completed: ${name}`);
      this.emit('taskCompleted', { name, result });
      return result;
    } catch (err) {
      task.error = err;
      task.done = true;
      this.logger.error(`Task failed: ${name} - ${err.message}`);
      this.emit('taskFailed', { name, error: err });
      throw err;
    } finally {
      this._task = null;
    }
  }

  /**
   * Get component status
   */
  getStatus() {
    return {
      name: this.name,
      state: this._state,
      isRunning: this.isRunning,
      startedAt: this._startedAt,
      stoppedAt: this._stoppedAt,
      uptimeMs: this._startedAt
        ? (this._stoppedAt || Date.now()) - this._startedAt
        : 0,
      tickCount: this._tickCount,
      tickErrors: this._tickErrors,
      lastTickTime: this._lastTickTime,
      hasActiveTask: this._task !== null,
      activeTaskName: this._task?.name || null,
    };
  }

  /**
   * Sleep utility that respects stop state
   * @param {number} ms
   */
  async sleep(ms) {
    return new Promise((resolve) => {
      if (this._state !== RunState.RUNNING) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, ms);
      // Allow cleanup on stop
      this.once('stopped', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

module.exports = { RunnableBase, RunState };
