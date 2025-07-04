const { errorResponse } = require('@tasktrackr/common');

const errorHandler = (err, req, res, next) => {
  console.error('Notification Service Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default server error
  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  errorResponse(res, message, statusCode);
};

module.exports = {
  errorHandler
};