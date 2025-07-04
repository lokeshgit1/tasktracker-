// Models
const User = require('./models/User');
const Task = require('./models/Task');

// Middleware
const { authMiddleware, adminMiddleware, optionalAuth } = require('./middleware/auth');

// Utils
const { userValidation, taskValidation, validate, validateQuery } = require('./utils/validation');
const {
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
  createdResponse,
  noContentResponse,
  tooManyRequestsResponse,
  serviceUnavailableResponse
} = require('./utils/response');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  generateTokensForUser,
  isTokenExpired,
  getTokenExpiration,
  generateResetToken,
  generateVerificationToken
} = require('./utils/jwt');

module.exports = {
  // Models
  User,
  Task,
  
  // Middleware
  authMiddleware,
  adminMiddleware,
  optionalAuth,
  
  // Validation
  userValidation,
  taskValidation,
  validate,
  validateQuery,
  
  // Responses
  successResponse,
  errorResponse,
  paginatedResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
  serverErrorResponse,
  createdResponse,
  noContentResponse,
  tooManyRequestsResponse,
  serviceUnavailableResponse,
  
  // JWT Utils
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  extractTokenFromHeader,
  generateTokensForUser,
  isTokenExpired,
  getTokenExpiration,
  generateResetToken,
  generateVerificationToken
};