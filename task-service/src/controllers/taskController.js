const { 
  Task, 
  successResponse, 
  errorResponse,
  paginatedResponse,
  notFoundResponse 
} = require('@tasktrackr/common');

/**
 * Create a new task
 */
const createTask = async (req, res) => {
  try {
    const userId = req.user._id;
    const taskData = {
      ...req.body,
      userId
    };

    const task = new Task(taskData);
    await task.save();

    // Populate user info for response
    await task.populate('userId', 'name email');

    successResponse(res, task, 'Task created successfully', 201);

  } catch (error) {
    console.error('Create task error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return errorResponse(res, 'Validation failed', 400, errors);
    }
    
    errorResponse(res, 'Failed to create task', 500);
  }
};

/**
 * Get all tasks for the authenticated user
 */
const getTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      category: req.query.category,
      tags: req.query.tags ? req.query.tags.split(',') : null,
      overdue: req.query.overdue === 'true',
      dueSoon: req.query.dueSoon === 'true'
    };

    // Use the static method from Task model
    let query = Task.findByUserWithFilters(userId, filters);

    // Search functionality
    if (req.query.search) {
      query = query.and({
        $or: [
          { title: { $regex: req.query.search, $options: 'i' } },
          { description: { $regex: req.query.search, $options: 'i' } }
        ]
      });
    }

    // Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const sortObject = {};
    sortObject[sortBy] = sortOrder;

    // Execute query with pagination
    const [tasks, total] = await Promise.all([
      query
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      Task.countDocuments({ 
        userId, 
        isArchived: false,
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority })
      })
    ]);

    paginatedResponse(res, tasks, { page, limit, total }, 'Tasks retrieved successfully');

  } catch (error) {
    console.error('Get tasks error:', error);
    errorResponse(res, 'Failed to retrieve tasks', 500);
  }
};

/**
 * Get task by ID
 */
const getTaskById = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId }).populate('userId', 'name email');
    
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    successResponse(res, task, 'Task retrieved successfully');

  } catch (error) {
    console.error('Get task by ID error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }
    
    errorResponse(res, 'Failed to retrieve task', 500);
  }
};

/**
 * Update task
 */
const updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.userId;
    delete updates._id;
    delete updates.createdAt;
    delete updates.syncVersion;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      updates,
      { new: true, runValidators: true }
    ).populate('userId', 'name email');

    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    successResponse(res, task, 'Task updated successfully');

  } catch (error) {
    console.error('Update task error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      return errorResponse(res, 'Validation failed', 400, errors);
    }
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }
    
    errorResponse(res, 'Failed to update task', 500);
  }
};

/**
 * Delete task
 */
const deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const task = await Task.findOneAndDelete({ _id: taskId, userId });
    
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    // TODO: Clean up associated files/attachments
    // This would be handled in a real implementation

    successResponse(res, null, 'Task deleted successfully');

  } catch (error) {
    console.error('Delete task error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }
    
    errorResponse(res, 'Failed to delete task', 500);
  }
};

/**
 * Archive/Unarchive task
 */
const archiveTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;
    const { archive } = req.body;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { isArchived: archive },
      { new: true }
    ).populate('userId', 'name email');

    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    const message = archive ? 'Task archived successfully' : 'Task unarchived successfully';
    successResponse(res, task, message);

  } catch (error) {
    console.error('Archive task error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }
    
    errorResponse(res, 'Failed to archive task', 500);
  }
};

/**
 * Bulk update tasks
 */
const bulkUpdateTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const { taskIds, updates } = req.body;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return errorResponse(res, 'Task IDs are required', 400);
    }

    // Remove fields that shouldn't be updated
    delete updates.userId;
    delete updates._id;
    delete updates.createdAt;

    const result = await Task.updateMany(
      { _id: { $in: taskIds }, userId },
      updates,
      { runValidators: true }
    );

    successResponse(res, {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    }, `${result.modifiedCount} tasks updated successfully`);

  } catch (error) {
    console.error('Bulk update tasks error:', error);
    errorResponse(res, 'Failed to update tasks', 500);
  }
};

/**
 * Get task statistics
 */
const getTaskStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Task.aggregate([
      { $match: { userId, isArchived: false } },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$status', 'completed'] },
                    { $ne: ['$dueDate', null] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Priority breakdown
    const priorityStats = await Task.aggregate([
      { $match: { userId, isArchived: false } },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Tasks completed this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentlyCompleted = await Task.countDocuments({
      userId,
      status: 'completed',
      completedAt: { $gte: weekAgo }
    });

    const result = {
      ...stats[0],
      priorityBreakdown: priorityStats.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentlyCompleted
    };

    // Remove _id field from aggregation
    delete result._id;

    successResponse(res, result, 'Task statistics retrieved successfully');

  } catch (error) {
    console.error('Get task stats error:', error);
    errorResponse(res, 'Failed to retrieve task statistics', 500);
  }
};

/**
 * Get tasks due soon (next 3 days)
 */
const getTasksDueSoon = async (req, res) => {
  try {
    const userId = req.user._id;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const tasks = await Task.find({
      userId,
      isArchived: false,
      status: { $ne: 'completed' },
      dueDate: {
        $gte: new Date(),
        $lte: threeDaysFromNow
      }
    })
    .sort({ dueDate: 1 })
    .populate('userId', 'name email');

    successResponse(res, tasks, 'Tasks due soon retrieved successfully');

  } catch (error) {
    console.error('Get tasks due soon error:', error);
    errorResponse(res, 'Failed to retrieve tasks due soon', 500);
  }
};

/**
 * Sync tasks (for offline functionality)
 */
const syncTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const { lastSyncTime, localChanges } = req.body;

    // Get server changes since last sync
    const serverChanges = await Task.find({
      userId,
      lastModified: { $gt: new Date(lastSyncTime) }
    }).populate('userId', 'name email');

    // Apply local changes to server (simple implementation)
    const syncResults = [];
    
    if (localChanges && Array.isArray(localChanges)) {
      for (const change of localChanges) {
        try {
          if (change.type === 'create') {
            const task = new Task({ ...change.data, userId });
            await task.save();
            syncResults.push({ type: 'created', _id: task._id, tempId: change.tempId });
          } else if (change.type === 'update') {
            await Task.findOneAndUpdate(
              { _id: change._id, userId },
              change.data,
              { runValidators: true }
            );
            syncResults.push({ type: 'updated', _id: change._id });
          } else if (change.type === 'delete') {
            await Task.findOneAndDelete({ _id: change._id, userId });
            syncResults.push({ type: 'deleted', _id: change._id });
          }
        } catch (error) {
          syncResults.push({ 
            type: 'error', 
            _id: change._id || change.tempId, 
            error: error.message 
          });
        }
      }
    }

    successResponse(res, {
      serverChanges,
      syncResults,
      lastSyncTime: new Date().toISOString()
    }, 'Tasks synced successfully');

  } catch (error) {
    console.error('Sync tasks error:', error);
    errorResponse(res, 'Failed to sync tasks', 500);
  }
};

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  archiveTask,
  bulkUpdateTasks,
  getTaskStats,
  getTasksDueSoon,
  syncTasks
};