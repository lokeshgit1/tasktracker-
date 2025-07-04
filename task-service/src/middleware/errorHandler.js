const { errorResponse } = require('@tasktrackr/common');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return errorResponse(res, 'Validation failed', 400, errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, `${field} already exists`, 400);
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    return errorResponse(res, 'Invalid ID format', 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401);
  }

  // Multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return errorResponse(res, 'File size too large', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return errorResponse(res, 'Unexpected file field', 400);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return errorResponse(res, 'Too many files', 400);
  }

  // Cloudinary errors
  if (err.http_code && err.http_code >= 400) {
    return errorResponse(res, 'File upload service error', 500);
  }

  // Rate limiting errors
  if (err.status === 429) {
    return errorResponse(res, 'Too many requests', 429);
  }

  // Default server error
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  errorResponse(res, message, statusCode);
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res) => {
  errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler
};