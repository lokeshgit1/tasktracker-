const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const taskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Title cannot be empty'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  reminder: {
    enabled: {
      type: Boolean,
      default: false
    },
    reminderDate: {
      type: Date,
      default: null
    },
    notified: {
      type: Boolean,
      default: false
    }
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
    default: 'General'
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: null
  },
  actualDuration: {
    type: Number, // in minutes
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  // For offline sync
  lastModified: {
    type: Date,
    default: Date.now
  },
  syncVersion: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ 'reminder.reminderDate': 1, 'reminder.enabled': 1 });
taskSchema.index({ lastModified: -1 });

// Virtual for overdue tasks
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'completed' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > this.dueDate;
});

// Virtual for days remaining
taskSchema.virtual('daysRemaining').get(function() {
  if (!this.dueDate || this.status === 'completed') return null;
  const now = new Date();
  const diffTime = this.dueDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Update lastModified on save
taskSchema.pre('save', function(next) {
  this.lastModified = new Date();
  this.syncVersion += 1;
  
  // Set completedAt when status changes to completed
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    } else if (this.status !== 'completed') {
      this.completedAt = null;
    }
  }
  
  next();
});

// Method to mark task as completed
taskSchema.methods.markCompleted = function() {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

// Method to set reminder
taskSchema.methods.setReminder = function(reminderDate) {
  this.reminder.enabled = true;
  this.reminder.reminderDate = reminderDate;
  this.reminder.notified = false;
  return this.save();
};

// Static method to get user's tasks with filters
taskSchema.statics.getUserTasks = function(userId, filters = {}) {
  const query = { userId, isArchived: false };
  
  if (filters.status) {
    query.status = filters.status;
  }
  
  if (filters.category) {
    query.category = filters.category;
  }
  
  if (filters.priority) {
    query.priority = filters.priority;
  }
  
  if (filters.dueBefore) {
    query.dueDate = { $lte: new Date(filters.dueBefore) };
  }
  
  if (filters.dueAfter) {
    query.dueDate = { ...query.dueDate, $gte: new Date(filters.dueAfter) };
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

// Static method to get overdue tasks
taskSchema.statics.getOverdueTasks = function(userId) {
  return this.find({
    userId,
    dueDate: { $lt: new Date() },
    status: { $in: ['pending', 'in-progress'] },
    isArchived: false
  });
};

module.exports = mongoose.model('Task', taskSchema);