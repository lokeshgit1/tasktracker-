const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const {
  Task,
  authMiddleware,
  successResponse,
  errorResponse,
  createdResponse,
  notFoundResponse,
  validationErrorResponse
} = require('@tasktrackr/common');

const router = express.Router();

// Configure Cloudinary if credentials are provided
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// File filter function
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Multer configuration for memory storage (for Cloudinary) or disk storage
const storage = process.env.CLOUDINARY_CLOUD_NAME 
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        try {
          await fs.mkdir(uploadDir, { recursive: true });
          cb(null, uploadDir);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    });

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per request
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = async (buffer, originalname, mimetype) => {
  return new Promise((resolve, reject) => {
    const resourceType = mimetype.startsWith('image/') ? 'image' : 'raw';
    
    cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: `tasktrackr/${uuidv4()}`,
        original_filename: originalname,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    ).end(buffer);
  });
};

// Helper function to optimize images
const optimizeImage = async (buffer, mimetype) => {
  if (!mimetype.startsWith('image/')) {
    return buffer;
  }

  try {
    return await sharp(buffer)
      .resize(1920, 1080, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 85,
        progressive: true 
      })
      .toBuffer();
  } catch (error) {
    console.error('Image optimization error:', error);
    return buffer; // Return original if optimization fails
  }
};

/**
 * @route   POST /api/attachments/upload/:taskId
 * @desc    Upload files to a task
 * @access  Private
 */
router.post('/upload/:taskId', authMiddleware, upload.array('files', 5), async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user._id;
    const files = req.files;

    if (!files || files.length === 0) {
      return validationErrorResponse(res, [
        { field: 'files', message: 'At least one file is required' }
      ]);
    }

    // Verify task exists and belongs to user
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    const attachments = [];
    const uploadPromises = files.map(async (file) => {
      try {
        let attachment = {
          filename: '',
          originalName: file.originalname,
          url: '',
          size: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        };

        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
          // Upload to Cloudinary
          let buffer = file.buffer;
          
          // Optimize images before upload
          if (file.mimetype.startsWith('image/')) {
            buffer = await optimizeImage(buffer, file.mimetype);
            attachment.size = buffer.length;
          }

          const cloudinaryResult = await uploadToCloudinary(buffer, file.originalname, file.mimetype);
          attachment.filename = cloudinaryResult.public_id;
          attachment.url = cloudinaryResult.secure_url;
        } else {
          // Local storage
          attachment.filename = file.filename;
          attachment.url = `/uploads/${file.filename}`;
        }

        attachments.push(attachment);
        return attachment;
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        throw new Error(`Failed to upload ${file.originalname}`);
      }
    });

    try {
      await Promise.all(uploadPromises);
    } catch (uploadError) {
      return errorResponse(res, uploadError.message, 500);
    }

    // Add attachments to task
    task.attachments.push(...attachments);
    await task.save();

    return createdResponse(res, {
      taskId: task._id,
      attachments,
      totalAttachments: task.attachments.length
    }, 'Files uploaded successfully');

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }

    return errorResponse(res, 'Failed to upload files', 500);
  }
});

/**
 * @route   DELETE /api/attachments/:taskId/:attachmentId
 * @desc    Delete attachment from task
 * @access  Private
 */
router.delete('/:taskId/:attachmentId', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const attachmentId = req.params.attachmentId;
    const userId = req.user._id;

    // Find task and verify ownership
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    // Find attachment
    const attachmentIndex = task.attachments.findIndex(
      att => att._id.toString() === attachmentId
    );

    if (attachmentIndex === -1) {
      return notFoundResponse(res, 'Attachment');
    }

    const attachment = task.attachments[attachmentIndex];

    try {
      // Delete from storage
      if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
        // Delete from Cloudinary
        await cloudinary.uploader.destroy(attachment.filename);
      } else {
        // Delete from local storage
        const filePath = path.join(__dirname, '../uploads', attachment.filename);
        try {
          await fs.unlink(filePath);
        } catch (fileError) {
          console.error('Local file deletion error:', fileError);
          // Continue even if file deletion fails
        }
      }
    } catch (storageError) {
      console.error('Storage deletion error:', storageError);
      // Continue with database cleanup even if storage deletion fails
    }

    // Remove attachment from task
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    return successResponse(res, {
      taskId: task._id,
      deletedAttachmentId: attachmentId,
      remainingAttachments: task.attachments.length
    }, 'Attachment deleted successfully');

  } catch (error) {
    console.error('Delete attachment error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid ID format', 400);
    }

    return errorResponse(res, 'Failed to delete attachment', 500);
  }
});

/**
 * @route   GET /api/attachments/:taskId
 * @desc    Get all attachments for a task
 * @access  Private
 */
router.get('/:taskId', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId }).select('attachments title');
    
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    return successResponse(res, {
      taskId: task._id,
      taskTitle: task.title,
      attachments: task.attachments,
      totalAttachments: task.attachments.length
    }, 'Attachments retrieved successfully');

  } catch (error) {
    console.error('Get attachments error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }

    return errorResponse(res, 'Failed to retrieve attachments', 500);
  }
});

/**
 * @route   GET /api/attachments/download/:taskId/:attachmentId
 * @desc    Download attachment (for local storage only)
 * @access  Private
 */
router.get('/download/:taskId/:attachmentId', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const attachmentId = req.params.attachmentId;
    const userId = req.user._id;

    // Find task and verify ownership
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    // Find attachment
    const attachment = task.attachments.find(
      att => att._id.toString() === attachmentId
    );

    if (!attachment) {
      return notFoundResponse(res, 'Attachment');
    }

    // For Cloudinary URLs, redirect to the direct URL
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      return res.redirect(attachment.url);
    }

    // For local storage, serve the file
    const filePath = path.join(__dirname, '../uploads', attachment.filename);
    
    try {
      await fs.access(filePath);
      
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
      res.setHeader('Content-Type', attachment.mimeType);
      
      return res.sendFile(filePath);
    } catch (fileError) {
      return notFoundResponse(res, 'File');
    }

  } catch (error) {
    console.error('Download attachment error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid ID format', 400);
    }

    return errorResponse(res, 'Failed to download attachment', 500);
  }
});

/**
 * @route   POST /api/attachments/bulk-delete/:taskId
 * @desc    Bulk delete attachments from task
 * @access  Private
 */
router.post('/bulk-delete/:taskId', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user._id;
    const { attachmentIds } = req.body;

    if (!Array.isArray(attachmentIds) || attachmentIds.length === 0) {
      return validationErrorResponse(res, [
        { field: 'attachmentIds', message: 'Array of attachment IDs is required' }
      ]);
    }

    // Find task and verify ownership
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    // Find attachments to delete
    const attachmentsToDelete = task.attachments.filter(
      att => attachmentIds.includes(att._id.toString())
    );

    if (attachmentsToDelete.length === 0) {
      return notFoundResponse(res, 'Attachments');
    }

    // Delete from storage
    const deletionPromises = attachmentsToDelete.map(async (attachment) => {
      try {
        if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
          await cloudinary.uploader.destroy(attachment.filename);
        } else {
          const filePath = path.join(__dirname, '../uploads', attachment.filename);
          try {
            await fs.unlink(filePath);
          } catch (fileError) {
            console.error('Local file deletion error:', fileError);
          }
        }
      } catch (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    });

    await Promise.allSettled(deletionPromises);

    // Remove attachments from task
    task.attachments = task.attachments.filter(
      att => !attachmentIds.includes(att._id.toString())
    );
    
    await task.save();

    return successResponse(res, {
      taskId: task._id,
      deletedCount: attachmentsToDelete.length,
      remainingAttachments: task.attachments.length
    }, `${attachmentsToDelete.length} attachments deleted successfully`);

  } catch (error) {
    console.error('Bulk delete attachments error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }

    return errorResponse(res, 'Failed to delete attachments', 500);
  }
});

/**
 * @route   GET /api/attachments/stats/:taskId
 * @desc    Get attachment statistics for a task
 * @access  Private
 */
router.get('/stats/:taskId', authMiddleware, async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId }).select('attachments');
    
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    const attachments = task.attachments;
    const totalSize = attachments.reduce((sum, att) => sum + (att.size || 0), 0);
    
    // Group by file type
    const typeStats = attachments.reduce((stats, att) => {
      const type = att.mimeType?.split('/')[0] || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
      return stats;
    }, {});

    return successResponse(res, {
      taskId: task._id,
      totalAttachments: attachments.length,
      totalSize,
      totalSizeFormatted: formatFileSize(totalSize),
      typeBreakdown: typeStats,
      averageSize: attachments.length > 0 ? Math.round(totalSize / attachments.length) : 0
    }, 'Attachment statistics retrieved successfully');

  } catch (error) {
    console.error('Get attachment stats error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }

    return errorResponse(res, 'Failed to retrieve attachment statistics', 500);
  }
});

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;