/**
 * Error Handler Middleware
 * Centralized error handling for Express routes
 */

/**
 * Custom API Error class for structured error responses
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Create a standardized error response object
 */
function createErrorResponse(err, req) {
  const response = {
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred',
    statusCode: err.statusCode || 500,
    requestId: req.requestId || null,
    timestamp: new Date().toISOString(),
    path: req.originalUrl || req.url,
    method: req.method,
  };

  if (err.details) {
    response.details = err.details;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack.split('\n').map((line) => line.trim());
  }

  return response;
}

/**
 * Handle JSON parse errors from body parser
 */
function handleJsonError(err) {
  if (err.type === 'entity.parse.failed') {
    return new ApiError(400, 'Invalid JSON in request body', {
      received: err.body,
    });
  }
  if (err.type === 'entity.too.large') {
    return new ApiError(413, 'Request body too large');
  }
  return null;
}

/**
 * Handle validation errors
 */
function handleValidationError(err) {
  if (err.name === 'ValidationError') {
    return new ApiError(400, 'Validation failed', {
      fields: err.details || err.message,
    });
  }
  return null;
}

/**
 * Main error handler middleware
 * Catches all unhandled errors and returns structured JSON responses
 */
function errorHandler(err, req, res, _next) {
  // Handle known error types
  let error = handleJsonError(err) || handleValidationError(err);

  if (!error) {
    // Wrap unknown errors
    const statusCode = err.statusCode || err.status || 500;
    error = new ApiError(statusCode, err.message || 'Internal Server Error');
    error.stack = err.stack;
  }

  // Log the error
  const logEntry = {
    level: 'error',
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode: error.statusCode,
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  if (error.statusCode >= 500) {
    logEntry.stack = err.stack;
    console.error(JSON.stringify(logEntry));
  } else {
    console.warn(JSON.stringify(logEntry));
  }

  // Send error response
  const response = createErrorResponse(error, req);
  res.status(error.statusCode).json(response);
}

module.exports = { errorHandler, ApiError };
