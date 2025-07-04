const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer
 * @param {Object} options - Upload options
 */
const uploadFile = async (fileBuffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: options.folder || 'tasktrackr/attachments',
          resource_type: options.resource_type || 'auto',
          public_id: options.public_id,
          overwrite: options.overwrite || false,
          quality: options.quality || 'auto',
          fetch_format: options.fetch_format || 'auto'
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      ).end(fileBuffer);
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Public ID of the file
 * @param {Object} options - Delete options
 */
const deleteFile = async (publicId, options = {}) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: options.resource_type || 'auto'
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
};

/**
 * Get file information from Cloudinary
 * @param {string} publicId - Public ID of the file
 */
const getFileInfo = async (publicId) => {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary get file info error:', error);
    throw error;
  }
};

/**
 * Generate signed URL for file access
 * @param {string} publicId - Public ID of the file
 * @param {Object} options - URL options
 */
const getSignedUrl = (publicId, options = {}) => {
  try {
    return cloudinary.utils.private_download_url(publicId, 'auto', {
      expires_at: options.expires_at || Math.floor(Date.now() / 1000) + 3600, // 1 hour default
      attachment: options.attachment || false
    });
  } catch (error) {
    console.error('Cloudinary signed URL error:', error);
    throw error;
  }
};

/**
 * Generate optimized URL for file display
 * @param {string} publicId - Public ID of the file
 * @param {Object} transformations - Image transformations
 */
const getOptimizedUrl = (publicId, transformations = {}) => {
  try {
    return cloudinary.url(publicId, {
      fetch_format: 'auto',
      quality: 'auto',
      ...transformations
    });
  } catch (error) {
    console.error('Cloudinary optimized URL error:', error);
    throw error;
  }
};

/**
 * Upload multiple files
 * @param {Array} files - Array of file buffers with metadata
 */
const uploadMultipleFiles = async (files) => {
  try {
    const uploadPromises = files.map(file => 
      uploadFile(file.buffer, {
        folder: file.folder || 'tasktrackr/attachments',
        public_id: file.public_id
      })
    );
    
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple files upload error:', error);
    throw error;
  }
};

/**
 * Delete multiple files
 * @param {Array} publicIds - Array of public IDs
 */
const deleteMultipleFiles = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteFile(publicId));
    return await Promise.all(deletePromises);
  } catch (error) {
    console.error('Multiple files delete error:', error);
    throw error;
  }
};

/**
 * Check if Cloudinary is configured
 */
const isConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME && 
    process.env.CLOUDINARY_API_KEY && 
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Get folder contents
 * @param {string} folder - Folder path
 */
const getFolderContents = async (folder) => {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 500
    });
    return result;
  } catch (error) {
    console.error('Get folder contents error:', error);
    throw error;
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  getFileInfo,
  getSignedUrl,
  getOptimizedUrl,
  uploadMultipleFiles,
  deleteMultipleFiles,
  isConfigured,
  getFolderContents,
  cloudinary
};