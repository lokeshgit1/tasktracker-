const express = require('express');
const { 
  authMiddleware, 
  validateRequest, 
  validateQuery,
  schemas 
} = require('@tasktrackr/common');

const {
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
} = require('../controllers/taskController');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Task:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         userId:
 *           type: string
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, in-progress, completed]
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         category:
 *           type: string
 *         dueDate:
 *           type: string
 *           format: date-time
 *         completedAt:
 *           type: string
 *           format: date-time
 *         attachments:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Attachment'
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *         estimatedTime:
 *           type: integer
 *         actualTime:
 *           type: integer
 *         reminder:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             datetime:
 *               type: string
 *               format: date-time
 *             sent:
 *               type: boolean
 *         isArchived:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     Attachment:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *         originalName:
 *           type: string
 *         url:
 *           type: string
 *         mimeType:
 *           type: string
 *         size:
 *           type: integer
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *     
 *     CreateTaskRequest:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           minLength: 1
 *           maxLength: 200
 *         description:
 *           type: string
 *           maxLength: 2000
 *         status:
 *           type: string
 *           enum: [pending, in-progress, completed]
 *           default: pending
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *           default: medium
 *         category:
 *           type: string
 *           maxLength: 50
 *         dueDate:
 *           type: string
 *           format: date-time
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *             maxLength: 30
 *         estimatedTime:
 *           type: integer
 *           minimum: 0
 *         reminder:
 *           type: object
 *           properties:
 *             enabled:
 *               type: boolean
 *             datetime:
 *               type: string
 *               format: date-time
 */

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', validateRequest(schemas.task.create), createTask);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, in-progress, completed]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: overdue
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: dueSoon
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, dueDate, priority, title]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Task'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/', validateQuery(schemas.task.query), getTasks);

/**
 * @swagger
 * /api/tasks/stats:
 *   get:
 *     summary: Get task statistics for the authenticated user
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Task statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTasks:
 *                       type: integer
 *                     pendingTasks:
 *                       type: integer
 *                     inProgressTasks:
 *                       type: integer
 *                     completedTasks:
 *                       type: integer
 *                     overdueTasks:
 *                       type: integer
 *                     priorityBreakdown:
 *                       type: object
 *                     recentlyCompleted:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/stats', getTaskStats);

/**
 * @swagger
 * /api/tasks/due-soon:
 *   get:
 *     summary: Get tasks due in the next 3 days
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tasks due soon retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/due-soon', getTasksDueSoon);

/**
 * @swagger
 * /api/tasks/sync:
 *   post:
 *     summary: Sync tasks for offline functionality
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               lastSyncTime:
 *                 type: string
 *                 format: date-time
 *               localChanges:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [create, update, delete]
 *                     _id:
 *                       type: string
 *                     tempId:
 *                       type: string
 *                     data:
 *                       type: object
 *     responses:
 *       200:
 *         description: Tasks synced successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/sync', syncTasks);

/**
 * @swagger
 * /api/tasks/bulk:
 *   patch:
 *     summary: Bulk update multiple tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskIds
 *               - updates
 *             properties:
 *               taskIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               updates:
 *                 type: object
 *     responses:
 *       200:
 *         description: Tasks updated successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.patch('/bulk', bulkUpdateTasks);

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   get:
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get('/:taskId', getTaskById);

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   patch:
 *     summary: Update task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.patch('/:taskId', validateRequest(schemas.task.update), updateTask);

/**
 * @swagger
 * /api/tasks/{taskId}:
 *   delete:
 *     summary: Delete task by ID
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.delete('/:taskId', deleteTask);

/**
 * @swagger
 * /api/tasks/{taskId}/archive:
 *   patch:
 *     summary: Archive or unarchive task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - archive
 *             properties:
 *               archive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Task archive status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.patch('/:taskId/archive', archiveTask);

module.exports = router;