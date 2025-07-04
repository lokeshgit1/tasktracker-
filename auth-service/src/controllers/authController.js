const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { 
  User, 
  generateTokens, 
  successResponse, 
  errorResponse,
  validateRequest,
  schemas 
} = require('@tasktrackr/common');

const { sendEmail } = require('../services/emailService');

/**
 * Register a new user
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 400);
    }

    // Create new user
    const user = new User({
      name,
      email,
      password
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    // Send welcome email (optional)
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to TaskTrackr!',
        template: 'welcome',
        data: { name }
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    successResponse(res, {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    }, 'User registered successfully', 201);

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 11000) {
      return errorResponse(res, 'User with this email already exists', 400);
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return errorResponse(res, 'Validation failed', 400, errors);
    }
    
    errorResponse(res, 'Registration failed', 500);
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshTokens.push({ token: refreshToken });
    user.lastLogin = new Date();
    await user.save();

    successResponse(res, {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500);
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return errorResponse(res, 'Refresh token is required', 400);
    }

    // Find user with this refresh token
    const user = await User.findOne({ 
      'refreshTokens.token': token 
    });

    if (!user) {
      return errorResponse(res, 'Invalid refresh token', 401);
    }

    // Verify the refresh token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.tokenType !== 'refresh') {
        return errorResponse(res, 'Invalid token type', 401);
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

      // Remove old refresh token and add new one
      user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== token);
      user.refreshTokens.push({ token: newRefreshToken });
      await user.save();

      successResponse(res, {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      }, 'Token refreshed successfully');

    } catch (jwtError) {
      // Remove invalid refresh token
      user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== token);
      await user.save();
      
      return errorResponse(res, 'Invalid or expired refresh token', 401);
    }

  } catch (error) {
    console.error('Token refresh error:', error);
    errorResponse(res, 'Token refresh failed', 500);
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user._id;

    // Remove refresh token from user
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { token: refreshToken } }
    });

    successResponse(res, null, 'Logout successful');

  } catch (error) {
    console.error('Logout error:', error);
    errorResponse(res, 'Logout failed', 500);
  }
};

/**
 * Logout from all devices
 */
const logoutAll = async (req, res) => {
  try {
    const userId = req.user._id;

    // Remove all refresh tokens
    await User.findByIdAndUpdate(userId, {
      refreshTokens: []
    });

    successResponse(res, null, 'Logged out from all devices');

  } catch (error) {
    console.error('Logout all error:', error);
    errorResponse(res, 'Logout failed', 500);
  }
};

/**
 * Forgot password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists or not
      return successResponse(res, null, 'If the email exists, a password reset link has been sent');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token (you might want to add these fields to User model)
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // Send reset email
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        template: 'passwordReset',
        data: { name: user.name, resetUrl }
      });
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      return errorResponse(res, 'Failed to send password reset email', 500);
    }

    successResponse(res, null, 'If the email exists, a password reset link has been sent');

  } catch (error) {
    console.error('Forgot password error:', error);
    errorResponse(res, 'Password reset request failed', 500);
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return errorResponse(res, 'Token and password are required', 400);
    }

    // Hash the token and find user
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return errorResponse(res, 'Invalid or expired reset token', 400);
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Logout from all devices
    
    await user.save();

    // Generate new tokens
    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    successResponse(res, {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken
      }
    }, 'Password reset successful');

  } catch (error) {
    console.error('Reset password error:', error);
    errorResponse(res, 'Password reset failed', 500);
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Get user with password
    const user = await User.findById(userId).select('+password');
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return errorResponse(res, 'Current password is incorrect', 400);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    successResponse(res, null, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    errorResponse(res, 'Password change failed', 500);
  }
};

/**
 * Verify email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // You would implement email verification logic here
    // This is a basic implementation
    
    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return errorResponse(res, 'Invalid verification token', 400);
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    successResponse(res, null, 'Email verified successfully');

  } catch (error) {
    console.error('Email verification error:', error);
    errorResponse(res, 'Email verification failed', 500);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  changePassword,
  verifyEmail
};