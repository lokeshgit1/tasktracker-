const Joi = require('joi');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }
    
    next();
  };
};

// Common validation schemas
const schemas = {
  user: {
    register: Joi.object({
      name: Joi.string().min(2).max(50).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).max(128).required()
    }),
    
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    }),
    
    updateProfile: Joi.object({
      name: Joi.string().min(2).max(50),
      preferences: Joi.object({
        theme: Joi.string().valid('light', 'dark', 'system'),
        notifications: Joi.object({
          email: Joi.boolean(),
          push: Joi.boolean(),
          desktop: Joi.boolean()
        }),
        timezone: Joi.string()
      })
    })
  },
  
  task: {
    create: Joi.object({
      title: Joi.string().min(1).max(200).required(),
      description: Joi.string().max(2000).allow(''),
      status: Joi.string().valid('pending', 'in-progress', 'completed').default('pending'),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
      category: Joi.string().max(50).default('General'),
      dueDate: Joi.date().greater('now'),
      tags: Joi.array().items(Joi.string().max(30)),
      estimatedTime: Joi.number().min(0),
      reminder: Joi.object({
        enabled: Joi.boolean(),
        datetime: Joi.date().greater('now')
      })
    }),
    
    update: Joi.object({
      title: Joi.string().min(1).max(200),
      description: Joi.string().max(2000).allow(''),
      status: Joi.string().valid('pending', 'in-progress', 'completed'),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
      category: Joi.string().max(50),
      dueDate: Joi.date().greater('now').allow(null),
      tags: Joi.array().items(Joi.string().max(30)),
      estimatedTime: Joi.number().min(0).allow(null),
      actualTime: Joi.number().min(0).allow(null),
      reminder: Joi.object({
        enabled: Joi.boolean(),
        datetime: Joi.date().greater('now').allow(null)
      })
    }),
    
    query: Joi.object({
      status: Joi.string().valid('pending', 'in-progress', 'completed'),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
      category: Joi.string(),
      tags: Joi.string(),
      overdue: Joi.boolean(),
      dueSoon: Joi.boolean(),
      page: Joi.number().min(1).default(1),
      limit: Joi.number().min(1).max(100).default(20),
      sortBy: Joi.string().valid('createdAt', 'dueDate', 'priority', 'title').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    })
  }
};

module.exports = {
  validateRequest,
  validateQuery,
  schemas
};