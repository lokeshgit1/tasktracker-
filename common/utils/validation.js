const Joi = require('joi');

// User validation schemas
const userValidation = {
  register: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters',
        'any.required': 'Name is required'
      }),
    
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'any.required': 'Password is required'
      }),
    
    role: Joi.string()
      .valid('user', 'admin')
      .default('user')
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  updateProfile: Joi.object({
    name: Joi.string()
      .min(2)
      .max(50)
      .trim()
      .optional(),
    
    avatar: Joi.string()
      .uri()
      .optional(),

    preferences: Joi.object({
      theme: Joi.string()
        .valid('light', 'dark', 'auto')
        .optional(),
      
      notifications: Joi.object({
        email: Joi.boolean().optional(),
        push: Joi.boolean().optional(),
        reminderMinutes: Joi.number().min(1).max(1440).optional()
      }).optional()
    }).optional()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    
    newPassword: Joi.string()
      .min(6)
      .max(128)
      .required()
      .messages({
        'string.min': 'New password must be at least 6 characters long',
        'string.max': 'New password cannot exceed 128 characters',
        'any.required': 'New password is required'
      })
  })
};

// Task validation schemas
const taskValidation = {
  create: Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .trim()
      .required()
      .messages({
        'string.min': 'Title cannot be empty',
        'string.max': 'Title cannot exceed 200 characters',
        'any.required': 'Task title is required'
      }),
    
    description: Joi.string()
      .max(2000)
      .trim()
      .allow('')
      .optional(),
    
    status: Joi.string()
      .valid('pending', 'in-progress', 'completed', 'cancelled')
      .default('pending'),
    
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .default('medium'),
    
    dueDate: Joi.date()
      .iso()
      .optional()
      .allow(null),
    
    category: Joi.string()
      .max(50)
      .trim()
      .default('General'),
    
    tags: Joi.array()
      .items(Joi.string().trim().lowercase())
      .optional(),
    
    estimatedDuration: Joi.number()
      .min(1)
      .optional()
      .allow(null),
    
    reminder: Joi.object({
      enabled: Joi.boolean().default(false),
      reminderDate: Joi.date().iso().optional().allow(null)
    }).optional()
  }),

  update: Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .trim()
      .optional(),
    
    description: Joi.string()
      .max(2000)
      .trim()
      .allow('')
      .optional(),
    
    status: Joi.string()
      .valid('pending', 'in-progress', 'completed', 'cancelled')
      .optional(),
    
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .optional(),
    
    dueDate: Joi.date()
      .iso()
      .optional()
      .allow(null),
    
    category: Joi.string()
      .max(50)
      .trim()
      .optional(),
    
    tags: Joi.array()
      .items(Joi.string().trim().lowercase())
      .optional(),
    
    estimatedDuration: Joi.number()
      .min(1)
      .optional()
      .allow(null),
    
    actualDuration: Joi.number()
      .min(1)
      .optional()
      .allow(null),
    
    reminder: Joi.object({
      enabled: Joi.boolean().optional(),
      reminderDate: Joi.date().iso().optional().allow(null)
    }).optional(),
    
    isArchived: Joi.boolean().optional()
  }),

  query: Joi.object({
    status: Joi.string()
      .valid('pending', 'in-progress', 'completed', 'cancelled')
      .optional(),
    
    priority: Joi.string()
      .valid('low', 'medium', 'high', 'urgent')
      .optional(),
    
    category: Joi.string()
      .optional(),
    
    dueBefore: Joi.date()
      .iso()
      .optional(),
    
    dueAfter: Joi.date()
      .iso()
      .optional(),
    
    isArchived: Joi.boolean()
      .default(false),
    
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10),
    
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'dueDate', 'priority', 'title')
      .default('createdAt'),
    
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc'),
    
    search: Joi.string()
      .trim()
      .optional()
  })
};

// Generic validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails
      });
    }

    req.body = value;
    next();
  };
};

// Query validation middleware
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors: errorDetails
      });
    }

    req.query = value;
    next();
  };
};

module.exports = {
  userValidation,
  taskValidation,
  validate,
  validateQuery
};