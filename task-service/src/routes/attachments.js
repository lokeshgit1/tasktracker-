const express = require('express');
const { authMiddleware } = require('@tasktrackr/common');
const upload = require('../middleware/upload');

const {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  getAttachment,
  getAttachmentUrl
} = require('../controllers/attachmentController');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @swagger
 * /api/attachments/{taskId}:
 *   post:
 *     summary: Upload file attachment to a task
 *     tags: [Attachments]
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
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
 *                   $ref: '#/components/schemas/Attachment'
 *       400:
 *         description: No file uploaded or validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.post('/:taskId', upload.single('file'), uploadAttachment);

/**
 * @swagger
 * /api/attachments/{taskId}:
 *   get:
 *     summary: Get all attachments for a task
 *     tags: [Attachments]
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
 *         description: Attachments retrieved successfully
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
 *                     $ref: '#/components/schemas/Attachment'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task not found
 *       500:
 *         description: Server error
 */
router.get('/:taskId', getAttachments);

/**
 * @swagger
 * /api/attachments/{taskId}/{attachmentId}:
 *   get:
 *     summary: Get attachment details
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task or attachment not found
 *       500:
 *         description: Server error
 */
router.get('/:taskId/:attachmentId', getAttachment);

/**
 * @swagger
 * /api/attachments/{taskId}/{attachmentId}/url:
 *   get:
 *     summary: Get temporary signed URL for attachment download
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment URL generated successfully
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
 *                     url:
 *                       type: string
 *                     originalName:
 *                       type: string
 *                     mimeType:
 *                       type: string
 *                     size:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task or attachment not found
 *       500:
 *         description: Server error
 */
router.get('/:taskId/:attachmentId/url', getAttachmentUrl);

/**
 * @swagger
 * /api/attachments/{taskId}/{attachmentId}:
 *   delete:
 *     summary: Delete attachment from task
 *     tags: [Attachments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: attachmentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Attachment deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Task or attachment not found
 *       500:
 *         description: Server error
 */
router.delete('/:taskId/:attachmentId', deleteAttachment);

module.exports = router;