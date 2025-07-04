const express = require('express');
const {
  User,
  userValidation,
  validate,
  authMiddleware,
  adminMiddleware,
  successResponse,
  errorResponse,
  notFoundResponse,
  paginatedResponse,
  validationErrorResponse
} = require('@tasktrackr/common');

const router = express.Router();

/**
 * @route   GET /api/user/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authMiddleware, async (req, res) => {
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
    }, 'Profile retrieved successfully');

  } catch (error) {
    console.error('Get profile error:', error);
    return errorResponse(res, 'Failed to retrieve profile', 500);
  }
});

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware, validate(userValidation.updateProfile), async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated this way
    delete updateData.email;
    delete updateData.password;
    delete updateData.role;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return notFoundResponse(res, 'User');
    }

    return successResponse(res, {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      avatar: updatedUser.avatar,
      preferences: updatedUser.preferences,
      isEmailVerified: updatedUser.isEmailVerified,
      lastLogin: updatedUser.lastLogin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    }, 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return validationErrorResponse(res, errors);
    }

    return errorResponse(res, 'Failed to update profile', 500);
  }
});

/**
 * @route   PUT /api/user/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { preferences } = req.body;

    if (!preferences) {
      return validationErrorResponse(res, [
        { field: 'preferences', message: 'Preferences object is required' }
      ]);
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return notFoundResponse(res, 'User');
    }

    return successResponse(res, {
      preferences: updatedUser.preferences
    }, 'Preferences updated successfully');

  } catch (error) {
    console.error('Update preferences error:', error);
    return errorResponse(res, 'Failed to update preferences', 500);
  }
});

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    if (!password) {
      return validationErrorResponse(res, [
        { field: 'password', message: 'Password is required to delete account' }
      ]);
    }

    // Get user with password to verify
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return notFoundResponse(res, 'User');
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return errorResponse(res, 'Invalid password', 401);
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // TODO: Delete associated tasks in task service
    // This could be done via:
    // 1. Service-to-service communication
    // 2. Event system (Redis pub/sub)
    // 3. Database cascade delete

    return successResponse(res, null, 'Account deleted successfully');

  } catch (error) {
    console.error('Delete account error:', error);
    return errorResponse(res, 'Failed to delete account', 500);
  }
});

// Admin routes

/**
 * @route   GET /api/user/admin/users
 * @desc    Get all users (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const role = req.query.role;

    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && ['user', 'admin'].includes(role)) {
      query.role = role;
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return paginatedResponse(res, users, {
      page,
      limit,
      totalPages,
      totalItems: total
    }, 'Users retrieved successfully');

  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(res, 'Failed to retrieve users', 500);
  }
});

/**
 * @route   GET /api/user/admin/users/:id
 * @desc    Get user by ID (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return notFoundResponse(res, 'User');
    }

    return successResponse(res, user, 'User retrieved successfully');

  } catch (error) {
    console.error('Get user by ID error:', error);
    return errorResponse(res, 'Failed to retrieve user', 500);
  }
});

/**
 * @route   PUT /api/user/admin/users/:id
 * @desc    Update user by ID (admin only)
 * @access  Private (Admin)
 */
router.put('/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const updateData = req.body;

    // Don't allow password updates through this route
    delete updateData.password;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return notFoundResponse(res, 'User');
    }

    return successResponse(res, updatedUser, 'User updated successfully');

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return validationErrorResponse(res, errors);
    }

    return errorResponse(res, 'Failed to update user', 500);
  }
});

/**
 * @route   DELETE /api/user/admin/users/:id
 * @desc    Delete user by ID (admin only)
 * @access  Private (Admin)
 */
router.delete('/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const userId = req.params.id;
    const currentUserId = req.user._id;

    // Prevent admin from deleting themselves
    if (userId === currentUserId.toString()) {
      return errorResponse(res, 'You cannot delete your own account through admin panel', 400);
    }

    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return notFoundResponse(res, 'User');
    }

    // TODO: Delete associated tasks
    // This could be handled by the task service

    return successResponse(res, null, 'User deleted successfully');

  } catch (error) {
    console.error('Delete user error:', error);
    return errorResponse(res, 'Failed to delete user', 500);
  }
});

/**
 * @route   GET /api/user/admin/stats
 * @desc    Get user statistics (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [
      totalUsers,
      adminUsers,
      regularUsers,
      verifiedUsers,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ isEmailVerified: true }),
      User.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    return successResponse(res, {
      totalUsers,
      adminUsers,
      regularUsers,
      verifiedUsers,
      unverifiedUsers: totalUsers - verifiedUsers,
      recentUsers // Users registered in last 30 days
    }, 'User statistics retrieved successfully');

  } catch (error) {
    console.error('Get user stats error:', error);
    return errorResponse(res, 'Failed to retrieve user statistics', 500);
  }
});

module.exports = router;