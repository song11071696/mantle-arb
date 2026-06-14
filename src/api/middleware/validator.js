/**
 * Validator Middleware
 * Request validation using schema-based rules
 */

/**
 * Built-in validation rules
 */
const rules = {
  required: (value, field) => {
    if (value === undefined || value === null || value === '') {
      return `${field} is required`;
    }
    return null;
  },

  string: (value, field) => {
    if (value !== undefined && typeof value !== 'string') {
      return `${field} must be a string`;
    }
    return null;
  },

  number: (value, field) => {
    if (value !== undefined && (typeof value !== 'number' && isNaN(Number(value)))) {
      return `${field} must be a number`;
    }
    return null;
  },

  boolean: (value, field) => {
    if (value !== undefined && typeof value !== 'boolean') {
      return `${field} must be a boolean`;
    }
    return null;
  },

  array: (value, field) => {
    if (value !== undefined && !Array.isArray(value)) {
      return `${field} must be an array`;
    }
    return null;
  },

  minLength: (min) => (value, field) => {
    if (value && typeof value === 'string' && value.length < min) {
      return `${field} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max) => (value, field) => {
    if (value && typeof value === 'string' && value.length > max) {
      return `${field} must be at most ${max} characters`;
    }
    return null;
  },

  oneOf: (options) => (value, field) => {
    if (value !== undefined && !options.includes(value)) {
      return `${field} must be one of: ${options.join(', ')}`;
    }
    return null;
  },

  pattern: (regex, description) => (value, field) => {
    if (value && !regex.test(String(value))) {
      return `${field} ${description || 'has invalid format'}`;
    }
    return null;
  },
};

/**
 * Validate a request body against a schema
 * @param {Object} schema - Validation schema { field: [rule1, rule2, ...] }
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, fieldRules] of Object.entries(schema)) {
      const value = req.body[field];
      for (const rule of fieldRules) {
        const error = typeof rule === 'function' ? rule(value, field) : null;
        if (error) errors.push(error);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Request body validation failed',
        details: errors,
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
}

/**
 * Validate query parameters against a schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, fieldRules] of Object.entries(schema)) {
      const value = req.query[field];
      for (const rule of fieldRules) {
        const error = typeof rule === 'function' ? rule(value, field) : null;
        if (error) errors.push(error);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Query parameter validation failed',
        details: errors,
        timestamp: new Date().toISOString(),
      });
    }
    next();
  };
}

/**
 * Generic validator middleware (used by server.js as a simple pass-through)
 * More specific validation can be applied per-route using validateBody/validateQuery
 */
function validator(req, res, next) {
  // Sanitize content-type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (contentType && !contentType.includes('application/json') && !contentType.includes('application/x-www-form-urlencoded')) {
      // Allow but warn
      req._contentTypeWarning = `Unexpected Content-Type: ${contentType}`;
    }
  }
  next();
}

module.exports = { validator, validateBody, validateQuery, rules };
