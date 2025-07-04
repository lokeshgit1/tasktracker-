const { 
  Task, 
  successResponse, 
  errorResponse,
  notFoundResponse 
} = require('@tasktrackr/common');

const cloudinary = require('../services/cloudinaryService');

/**
 * Upload file attachment to a task
 */
const uploadAttachment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }

    // Find the task
    const task = await Task.findOne({ _id: taskId, userId });
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    // Upload file to Cloudinary
    let uploadResult;
    try {
      uploadResult = await cloudinary.uploadFile(req.file.buffer, {
        folder: `tasktrackr/attachments/${userId}`,
        resource_type: 'auto'
      });
    } catch (uploadError) {
      console.error('File upload error:', uploadError);
      return errorResponse(res, 'Failed to upload file', 500);
    }

    // Create attachment object
    const attachment = {
      filename: uploadResult.public_id,
      originalName: req.file.originalname,
      url: uploadResult.secure_url,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date()
    };

    // Add attachment to task
    task.attachments.push(attachment);
    await task.save();

    successResponse(res, attachment, 'File uploaded successfully', 201);

  } catch (error) {
    console.error('Upload attachment error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }
    
    errorResponse(res, 'Failed to upload attachment', 500);
  }
};

/**
 * Get all attachments for a task
 */
const getAttachments = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId }, 'attachments');
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    successResponse(res, task.attachments, 'Attachments retrieved successfully');

  } catch (error) {
    console.error('Get attachments error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid task ID format', 400);
    }
    
    errorResponse(res, 'Failed to retrieve attachments', 500);
  }
};

/**
 * Delete an attachment from a task
 */
const deleteAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    const userId = req.user._id;

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

    // Delete from Cloudinary
    try {
      await cloudinary.deleteFile(attachment.filename);
    } catch (deleteError) {
      console.error('Failed to delete file from Cloudinary:', deleteError);
      // Continue with database deletion even if Cloudinary deletion fails
    }

    // Remove attachment from task
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    successResponse(res, null, 'Attachment deleted successfully');

  } catch (error) {
    console.error('Delete attachment error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid ID format', 400);
    }
    
    errorResponse(res, 'Failed to delete attachment', 500);
  }
};

/**
 * Download/Get attachment details
 */
const getAttachment = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId }, 'attachments');
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    const attachment = task.attachments.find(
      att => att._id.toString() === attachmentId
    );

    if (!attachment) {
      return notFoundResponse(res, 'Attachment');
    }

    successResponse(res, attachment, 'Attachment retrieved successfully');

  } catch (error) {
    console.error('Get attachment error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid ID format', 400);
    }
    
    errorResponse(res, 'Failed to retrieve attachment', 500);
  }
};

/**
 * Get attachment URL for direct access (temporary signed URL)
 */
const getAttachmentUrl = async (req, res) => {
  try {
    const { taskId, attachmentId } = req.params;
    const userId = req.user._id;

    const task = await Task.findOne({ _id: taskId, userId }, 'attachments');
    if (!task) {
      return notFoundResponse(res, 'Task');
    }

    const attachment = task.attachments.find(
      att => att._id.toString() === attachmentId
    );

    if (!attachment) {
      return notFoundResponse(res, 'Attachment');
    }

    // Generate signed URL for temporary access
    const signedUrl = cloudinary.getSignedUrl(attachment.filename, {
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour expiry
    });

    successResponse(res, { 
      url: signedUrl,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      size: attachment.size
    }, 'Attachment URL generated successfully');

  } catch (error) {
    console.error('Get attachment URL error:', error);
    
    if (error.name === 'CastError') {
      return errorResponse(res, 'Invalid ID format', 400);
    }
    
    errorResponse(res, 'Failed to generate attachment URL', 500);
  }
};

module.exports = {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
  getAttachment,
  getAttachmentUrl
};