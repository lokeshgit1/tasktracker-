const multer = require('multer');
const { errorResponse } = require('@tasktrackr/common');

// File filter function
const fileFilter = (req, file, cb) => {
  // Get allowed file types from environment or use defaults
  const allowedTypes = process.env.ALLOWED_FILE_TYPES 
    ? process.env.ALLOWED_FILE_TYPES.split(',')
    : ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt'];

  // Extract file extension
  const fileExtension = file.originalname.split('.').pop().toLowerCase();
  
  // Check MIME types for additional security
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(fileExtension) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`), false);
  }
};

// Configure multer for memory storage (we'll upload to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB default
    files: 5 // Max 5 files per request
  },
  fileFilter: fileFilter
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 'File size too large. Maximum size is 10MB.', 400);
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return errorResponse(res, 'Too many files. Maximum 5 files allowed.', 400);
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return errorResponse(res, 'Unexpected file field.', 400);
    }
    return errorResponse(res, error.message, 400);
  }
  
  if (error.message.includes('File type not allowed')) {
    return errorResponse(res, error.message, 400);
  }
  
  next(error);
};

// Middleware to validate file upload
const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return errorResponse(res, 'No file uploaded', 400);
  }
  next();
};

// Middleware to check file size manually (additional check)
const checkFileSize = (req, res, next) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
  
  if (req.file && req.file.size > maxSize) {
    return errorResponse(res, `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB.`, 400);
  }
  
  if (req.files) {
    for (const file of req.files) {
      if (file.size > maxSize) {
        return errorResponse(res, `File size too large. Maximum size is ${maxSize / 1024 / 1024}MB.`, 400);
      }
    }
  }
  
  next();
};

// Create upload configurations for different scenarios
const singleFileUpload = upload.single('file');
const multipleFileUpload = upload.array('files', 5);
const fieldsUpload = upload.fields([
  { name: 'file', maxCount: 1 },
  { name: 'files', maxCount: 5 }
]);

// Wrap upload middleware with error handling
const createUploadMiddleware = (uploadConfig) => {
  return (req, res, next) => {
    uploadConfig(req, res, (error) => {
      if (error) {
        return handleMulterError(error, req, res, next);
      }
      next();
    });
  };
};

module.exports = {
  single: createUploadMiddleware(singleFileUpload),
  array: createUploadMiddleware(multipleFileUpload),
  fields: createUploadMiddleware(fieldsUpload),
  validateFileUpload,
  checkFileSize,
  handleMulterError
};