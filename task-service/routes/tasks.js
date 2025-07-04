const express = require('express');
const {
  Task,
  taskValidation,
  validate,
  validateQuery,
  authMiddleware,
  adminMiddleware,
  successResponse,
  errorResponse,
  createdResponse,
  notFoundResponse,
  paginatedResponse,
  validationErrorResponse
} = require('@tasktrackr/common');

const router = express.Router();

/**
 * @route   GET /api/tasks
 * @desc    Get user's tasks with filtering and pagination
 * @access  Private
 */
router.get('/', authMiddleware, validateQuery(taskValidation.query), async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      status,
      priority,
      category,
      dueBefore,
      dueAfter,
      isArchived,
      page,
      limit,
      sortBy,
      sortOrder,
      search
    } = req.query;

    // Build filter object
    const filters = {
      status,
      priority,
      category,
      dueBefore,
      dueAfter
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key] === undefined) {
        delete filters[key];
      }
    });

    // Get tasks with filters
    let query = Task.getUserTasks(userId, filters);

    // Add archived filter
    if (isArchived !== undefined) {
      query = query.where('isArchived', isArchived);
    }

    // Add search functionality
    if (search) {
      query = query.where({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ]
      });
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      query.sort(sortObj).skip(skip).limit(limit),
      Task.countDocuments(query.getQuery())
    ]);

    const totalPages = Math.ceil(total / limit);

    return paginatedResponse(res, tasks, {
      page,
      limit,
      totalPages,
      totalItems: total
    }, 'Tasks retrieved successfully');

  } catch (error) {
    console.error('Get tasks error:', error);
    return errorResponse(res, 'Failed to retrieve tasks', 500);
  }
});

/**
 * @route   GET /api/tasks/:id
 * @desc    Get task by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId });

    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    return successResponse(res, task, 'Task retrieved successfully');

  } catch (error) {
    console.error('Get task error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }
    
    return errorResponse(res, 'Failed to retrieve task', 500);
  }
});

/**
 * @route   POST /api/tasks
 * @desc    Create a new task
 * @access  Private
 */
router.post('/', authMiddleware, validate(taskValidation.create), async (req, res) => {
  try {
    const userId = req.user._id;
    const taskData = { ...req.body, userId };

    const task = new Task(taskData);
    await task.save();

    return createdResponse(res, task, 'Task created successfully');

  } catch (error) {
    console.error('Create task error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return validationErrorResponse(res, errors);
    }

    return errorResponse(res, 'Failed to create task', 500);
  }
});

/**
 * @route   PUT /api/tasks/:id
 * @desc    Update task by ID
 * @access  Private
 */
router.put('/:id', authMiddleware, validate(taskValidation.update), async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id;
    const updateData = req.body;

    // If status is being changed to completed, set completedAt
    if (updateData.status === 'completed') {
      updateData.completedAt = new Date();
    } else if (updateData.status && updateData.status !== 'completed') {
      updateData.completedAt = null;
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    return successResponse(res, task, 'Task updated successfully');

  } catch (error) {
    console.error('Update task error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return validationErrorResponse(res, errors);
    }

    return errorResponse(res, 'Failed to update task', 500);
  }
});

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete task by ID
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id;

    const task = await Task.findOneAndDelete({ _id: taskId, userId });

    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    // TODO: Delete associated attachments from storage
    // This should be handled by the attachment service

    return successResponse(res, null, 'Task deleted successfully');

  } catch (error) {
    console.error('Delete task error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }

    return errorResponse(res, 'Failed to delete task', 500);
  }
});

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update task status
 * @access  Private
 */
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id;
    const { status } = req.body;

    if (!status || !['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return validationErrorResponse(res, [
        { field: 'status', message: 'Valid status is required' }
      ]);
    }

    const updateData = { status };
    
    // Set completedAt timestamp if marking as completed
    if (status === 'completed') {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { $set: updateData },
      { new: true }
    );

    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    return successResponse(res, task, 'Task status updated successfully');

  } catch (error) {
    console.error('Update task status error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }

    return errorResponse(res, 'Failed to update task status', 500);
  }
});

/**
 * @route   PATCH /api/tasks/:id/archive
 * @desc    Archive/unarchive task
 * @access  Private
 */
router.patch('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user._id;
    const { archived } = req.body;

    if (typeof archived !== 'boolean') {
      return validationErrorResponse(res, [
        { field: 'archived', message: 'Archived must be a boolean value' }
      ]);
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, userId },
      { $set: { isArchived: archived } },
      { new: true }
    );

    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    const action = archived ? 'archived' : 'unarchived';
    return successResponse(res, task, `Task ${action} successfully`);

  } catch (error) {
    console.error('Archive task error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }

    return errorResponse(res, 'Failed to archive task', 500);
  }
});

/**
 * @route   POST /api/tasks/bulk-update
 * @desc    Bulk update tasks
 * @access  Private
 */
router.post('/bulk-update', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { taskIds, updateData } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return validationErrorResponse(res, [
        { field: 'taskIds', message: 'Array of task IDs is required' }
      ]);
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      return validationErrorResponse(res, [
        { field: 'updateData', message: 'Update data is required' }
      ]);
    }

    // Validate update fields
    const allowedFields = ['status', 'priority', 'category', 'isArchived'];
    const updateFields = Object.keys(updateData);
    const invalidFields = updateFields.filter(field => !allowedFields.includes(field));

    if (invalidFields.length > 0) {
      return validationErrorResponse(res, [
        { field: 'updateData', message: `Invalid fields: ${invalidFields.join(', ')}` }
      ]);
    }

    // Perform bulk update
    const result = await Task.updateMany(
      { _id: { $in: taskIds }, userId },
      { $set: updateData }
    );

    return successResponse(res, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      updatedTaskIds: taskIds
    }, `${result.modifiedCount} tasks updated successfully`);

  } catch (error) {
    console.error('Bulk update error:', error);
    return errorResponse(res, 'Failed to update tasks', 500);
  }
});

/**
 * @route   DELETE /api/tasks/bulk-delete
 * @desc    Bulk delete tasks
 * @access  Private
 */
router.delete('/bulk-delete', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { taskIds } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return validationErrorResponse(res, [
        { field: 'taskIds', message: 'Array of task IDs is required' }
      ]);
    }

    const result = await Task.deleteMany({
      _id: { $in: taskIds },
      userId
    });

    return successResponse(res, {
      deletedCount: result.deletedCount,
      deletedTaskIds: taskIds
    }, `${result.deletedCount} tasks deleted successfully`);

  } catch (error) {
    console.error('Bulk delete error:', error);
    return errorResponse(res, 'Failed to delete tasks', 500);
  }
});

/**
 * @route   GET /api/tasks/overdue
 * @desc    Get overdue tasks
 * @access  Private
 */
router.get('/overdue', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const overdueTasks = await Task.getOverdueTasks(userId);

    return successResponse(res, overdueTasks, 'Overdue tasks retrieved successfully');

  } catch (error) {
    console.error('Get overdue tasks error:', error);
    return errorResponse(res, 'Failed to retrieve overdue tasks', 500);
  }
});

/**
 * @route   GET /api/tasks/stats
 * @desc    Get task statistics for user
 * @access  Private
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      todayTasks,
      thisWeekTasks
    ] = await Promise.all([
      Task.countDocuments({ userId, isArchived: false }),
      Task.countDocuments({ userId, status: 'pending', isArchived: false }),
      Task.countDocuments({ userId, status: 'in-progress', isArchived: false }),
      Task.countDocuments({ userId, status: 'completed', isArchived: false }),
      Task.getOverdueTasks(userId).then(tasks => tasks.length),
      Task.countDocuments({
        userId,
        dueDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lt: new Date(new Date().setHours(23, 59, 59, 999))
        },
        isArchived: false
      }),
      Task.countDocuments({
        userId,
        dueDate: {
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          $lt: new Date()
        },
        isArchived: false
      })
    ]);

    return successResponse(res, {
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      overdueTasks,
      todayTasks,
      thisWeekTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    }, 'Task statistics retrieved successfully');

  } catch (error) {
    console.error('Get task stats error:', error);
    return errorResponse(res, 'Failed to retrieve task statistics', 500);
  }
});

// Admin routes

/**
 * @route   GET /api/tasks/admin/all
 * @desc    Get all tasks (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';

    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Get tasks and total count
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return paginatedResponse(res, tasks, {
      page,
      limit,
      totalPages,
      totalItems: total
    }, 'All tasks retrieved successfully');

  } catch (error) {
    console.error('Get all tasks error:', error);
    return errorResponse(res, 'Failed to retrieve tasks', 500);
  }
});

module.exports = router;