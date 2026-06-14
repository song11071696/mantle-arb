/**
 * Alert Manager - Manages and dispatches alerts
 */

const { Logger } = require('../utils/logger');
const { EventEmitter } = require('events');

class AlertManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.logger = new Logger('monitor:alert');
    this.alerts = [];
    this.rules = [];
    this.cooldowns = new Map(); // ruleId -> lastFired
    this.cooldownMs = config?.monitoring?.alertCooldownMs || 60000;
  }

  /**
   * Add an alert rule
   * @param {Object} rule - { id, type, condition, message }
   */
  addRule(rule) {
    this.rules.push(rule);
    this.logger.info(`Alert rule added: ${rule.id}`);
  }

  removeRule(id) {
    this.rules = this.rules.filter(r => r.id !== id);
  }

  /**
   * Evaluate rules against current data
   */
  evaluate(data) {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (this._isOnCooldown(rule.id)) continue;

      const triggered = this._checkCondition(rule, data);
      if (triggered) {
        const alert = this._fireAlert(rule, data);
        this.alerts.push(alert);
      }
    }
    return this.alerts.slice(-50);
  }

  _checkCondition(rule, data) {
    try {
      switch (rule.type) {
        case 'price_threshold': {
          const price = data[rule.pair]?.price;
          if (!price) return false;
          if (rule.direction === 'above' && price > rule.threshold) return true;
          if (rule.direction === 'below' && price < rule.threshold) return true;
          return false;
        }
        case 'spread': {
          const spread = data[rule.pair]?.spreadBps || 0n;
          return spread > rule.minSpreadBps;
        }
        case 'volume': {
          const vol = data[rule.pair]?.volume || 0n;
          return vol > rule.minVolume;
        }
        case 'custom': {
          return rule.condition(data);
        }
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  _fireAlert(rule, data) {
    const alert = {
      id: `alert-${Date.now()}`,
      ruleId: rule.id,
      severity: rule.severity || 'info',
      message: rule.message(data),
      data,
      timestamp: Date.now(),
    };

    this.cooldowns.set(rule.id, Date.now());
    this.logger[alert.severity === 'critical' ? 'error' : 'warn'](`ALERT: ${alert.message}`);
    this.emit('alert', alert);
    return alert;
  }

  _isOnCooldown(ruleId) {
    const last = this.cooldowns.get(ruleId);
    return last && Date.now() - last < this.cooldownMs;
  }

  getRecentAlerts(count = 20) {
    return this.alerts.slice(-count);
  }

  clearAlerts() {
    this.alerts = [];
  }
}

module.exports = { AlertManager };
