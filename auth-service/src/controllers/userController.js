const { 
  User, 
  successResponse, 
  errorResponse,
  paginatedResponse,
  notFoundResponse
} = require('@tasktrackr/common');

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const user = req.user;
    successResponse(res, user, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Get profile error:', error);
    errorResponse(res, 'Failed to retrieve profile', 500);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const allowedUpdates = ['name', 'preferences'];
    const updates = {};

    // Filter allowed updates
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 'No valid updates provided', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId, 
      updates, 
      { new: true, runValidators: true }
    );

    if (!user) {
      return notFoundResponse(res, 'User');
    }

    successResponse(res, user, 'Profile updated successfully');

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return errorResponse(res, 'Validation failed', 400, errors);
    }
    
    errorResponse(res, 'Failed to update profile', 500);
  }
};

/**
 * Delete user account
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { password } = req.body;

    // Get user with password for verification
    const user = await User.findById(userId).select('+password');
    
    // Verify password before deletion
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Password is incorrect', 400);
    }

    // TODO: Notify other services to clean up user data
    // This could be done through message queue or direct API calls
    
    // Delete user account
    await User.findByIdAndDelete(userId);

    successResponse(res, null, 'Account deleted successfully');

  } catch (error) {
    console.error('Delete account error:', error);
    errorResponse(res, 'Failed to delete account', 500);
  }
};

/**
 * Upload user avatar
 */
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // This would typically integrate with a file upload service
    // For now, we'll assume the avatar URL is provided in the request
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return errorResponse(res, 'Avatar URL is required', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    );

    successResponse(res, { avatar: user.avatar }, 'Avatar updated successfully');

  } catch (error) {
    console.error('Upload avatar error:', error);
    errorResponse(res, 'Failed to upload avatar', 500);
  }
};

/**
 * Get user by ID (Admin only)
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return notFoundResponse(res, 'User');
    }

    successResponse(res, user, 'User retrieved successfully');

  } catch (error) {
    console.error('Get user by ID error:', error);
    errorResponse(res, 'Failed to retrieve user', 500);
  }
};

/**
 * Get all users (Admin only)
 */
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const { search, role, status } = req.query;
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) {
      query.role = role;
    }
    
    if (status === 'verified') {
      query.isEmailVerified = true;
    } else if (status === 'unverified') {
      query.isEmailVerified = false;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-refreshTokens')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    paginatedResponse(res, users, { page, limit, total }, 'Users retrieved successfully');

  } catch (error) {
    console.error('Get all users error:', error);
    errorResponse(res, 'Failed to retrieve users', 500);
  }
};

/**
 * Update user role (Admin only)
 */
const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return errorResponse(res, 'Invalid role. Must be "user" or "admin"', 400);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!user) {
      return notFoundResponse(res, 'User');
    }

    successResponse(res, user, 'User role updated successfully');

  } catch (error) {
    console.error('Update user role error:', error);
    errorResponse(res, 'Failed to update user role', 500);
  }
};

/**
 * Get user statistics (Admin only)
 */
const getUserStats = async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          verifiedUsers: {
            $sum: { $cond: ['$isEmailVerified', 1, 0] }
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ['$role', 'admin'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalUsers: 1,
          verifiedUsers: 1,
          unverifiedUsers: { $subtract: ['$totalUsers', '$verifiedUsers'] },
          adminUsers: 1,
          regularUsers: { $subtract: ['$totalUsers', '$adminUsers'] }
        }
      }
    ]);

    // Get users registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    const result = stats[0] || {
      totalUsers: 0,
      verifiedUsers: 0,
      unverifiedUsers: 0,
      adminUsers: 0,
      regularUsers: 0
    };

    result.recentUsers = recentUsers;

    successResponse(res, result, 'User statistics retrieved successfully');

  } catch (error) {
    console.error('Get user stats error:', error);
    errorResponse(res, 'Failed to retrieve user statistics', 500);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  deleteAccount,
  uploadAvatar,
  getUserById,
  getAllUsers,
  updateUserRole,
  getUserStats
};