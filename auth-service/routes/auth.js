const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const {
  User,
  userValidation,
  validate,
  generateTokensForUser,
  verifyToken,
  successResponse,
  errorResponse,
  createdResponse,
  unauthorizedResponse,
  conflictResponse,
  validationErrorResponse,
  authMiddleware
} = require('@tasktrackr/common');

const router = express.Router();

// Additional rate limiting for sensitive operations
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per windowMs
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many attempts, please try again later'
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validate(userValidation.register), async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return conflictResponse(res, 'User with this email already exists');
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokensForUser(user);

    // Update last login
    await user.updateLastLogin();

    return createdResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt
      },
      tokens
    }, 'User registered successfully');

  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse(res, 'Registration failed', 500);
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', strictLimiter, validate(userValidation.login), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return unauthorizedResponse(res, 'Invalid email or password');
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return unauthorizedResponse(res, 'Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokensForUser(user);

    // Update last login
    await user.updateLastLogin();

    return successResponse(res, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      },
      tokens
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed', 500);
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return unauthorizedResponse(res, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return unauthorizedResponse(res, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokensForUser(user);

    return successResponse(res, {
      tokens
    }, 'Token refreshed successfully');

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return unauthorizedResponse(res, 'Invalid or expired refresh token');
    }
    
    console.error('Token refresh error:', error);
    return errorResponse(res, 'Token refresh failed', 500);
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    // In a production environment, you might want to:
    // 1. Blacklist the token
    // 2. Store invalidated tokens in Redis with expiration
    // 3. Remove refresh tokens from database if stored there
    
    return successResponse(res, null, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, 'Logout failed', 500);
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password', strictLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return validationErrorResponse(res, [{ field: 'email', message: 'Email is required' }]);
    }

    const user = await User.findOne({ email });
    
    // Always return success to prevent email enumeration
    if (!user) {
      return successResponse(res, null, 'If the email exists, a password reset link has been sent');
    }

    // Generate reset token (implement email sending in notification service)
    // const resetToken = generateResetToken(user._id, user.email);
    
    // TODO: Integrate with notification service to send email
    
    return successResponse(res, null, 'If the email exists, a password reset link has been sent');

  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse(res, 'Failed to process password reset request', 500);
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', strictLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return validationErrorResponse(res, [
        { field: 'token', message: 'Reset token is required' },
        { field: 'newPassword', message: 'New password is required' }
      ]);
    }

    if (newPassword.length < 6) {
      return validationErrorResponse(res, [
        { field: 'newPassword', message: 'Password must be at least 6 characters long' }
      ]);
    }

    // Verify reset token
    const decoded = verifyToken(token);
    
    if (decoded.type !== 'password_reset') {
      return unauthorizedResponse(res, 'Invalid reset token');
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return unauthorizedResponse(res, 'Invalid reset token');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return successResponse(res, null, 'Password reset successful');

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return unauthorizedResponse(res, 'Invalid or expired reset token');
    }
    
    console.error('Reset password error:', error);
    return errorResponse(res, 'Password reset failed', 500);
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
router.post('/change-password', authMiddleware, validate(userValidation.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Get user with password
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return unauthorizedResponse(res, 'User not found');
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return unauthorizedResponse(res, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return successResponse(res, null, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse(res, 'Password change failed', 500);
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = req.user;

    return successResponse(res, {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      preferences: user.preferences,
      isEmailVerified: user.isEmailVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }, 'User profile retrieved successfully');

  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse(res, 'Failed to retrieve user profile', 500);
  }
});

/**
 * @route   POST /api/auth/verify-token
 * @desc    Verify if token is valid
 * @access  Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return unauthorizedResponse(res, 'Token is required');
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return unauthorizedResponse(res, 'Invalid token');
    }

    return successResponse(res, {
      valid: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    }, 'Token is valid');

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return unauthorizedResponse(res, 'Invalid or expired token');
    }
    
    console.error('Token verification error:', error);
    return errorResponse(res, 'Token verification failed', 500);
  }
});

module.exports = router;