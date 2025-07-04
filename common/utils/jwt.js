const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT token
 */
const generateAccessToken = (payload, expiresIn = '24h') => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
};

/**
 * Generate JWT refresh token
 * @param {Object} payload - Token payload
 * @param {string} expiresIn - Token expiration time
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload, expiresIn = '7d') => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key for verification
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token, secret = process.env.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw error;
  }
};

/**
 * Decode JWT token without verification
 * @param {string} token - JWT token to decode
 * @returns {Object} Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Generate tokens for user authentication
 * @param {Object} user - User object
 * @returns {Object} Access and refresh tokens
 */
const generateTokensForUser = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role
  };

  const accessToken = generateAccessToken(payload, '24h');
  const refreshToken = generateRefreshToken({ userId: user._id }, '7d');

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: 24 * 60 * 60 // 24 hours in seconds
  };
};

/**
 * Validate token expiration
 * @param {Object} decodedToken - Decoded JWT token
 * @returns {boolean} True if token is expired
 */
const isTokenExpired = (decodedToken) => {
  if (!decodedToken.exp) {
    return true;
  }
  
  const currentTime = Math.floor(Date.now() / 1000);
  return decodedToken.exp < currentTime;
};

/**
 * Get token expiration time
 * @param {Object} decodedToken - Decoded JWT token
 * @returns {Date|null} Expiration date or null
 */
const getTokenExpiration = (decodedToken) => {
  if (!decodedToken.exp) {
    return null;
  }
  
  return new Date(decodedToken.exp * 1000);
};

/**
 * Create token for password reset
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} Reset token
 */
const generateResetToken = (userId, email) => {
  const payload = {
    userId,
    email,
    type: 'password_reset'
  };
  
  return generateAccessToken(payload, '1h'); // 1 hour expiration for reset tokens
};

/**
 * Create token for email verification
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} Verification token
 */
const generateVerificationToken = (userId, email) => {
  const payload = {
    userId,
    email,
    type: 'email_verification'
  };
  
  return generateAccessToken(payload, '24h'); // 24 hours for email verification
};

module.exports = {
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