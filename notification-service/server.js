const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const notificationRoutes = require('./routes/notifications');
const emailRoutes = require('./routes/email');
const { errorResponse } = require('@tasktrackr/common');
const emailService = require('./services/emailService');
const reminderService = require('./services/reminderService');

const app = express();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Email rate limiting
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // max 50 emails per hour per IP
  skipSuccessfulRequests: true
});

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Initialize database connection
connectDB();

// Initialize email service
emailService.initialize();

// Health check endpoint
app.get('/api/notifications/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notification service is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'notification-service',
    version: '1.0.0',
    emailConfigured: emailService.isConfigured()
  });
});

// API Routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/email', emailLimiter, emailRoutes);

// Setup cron jobs for automated tasks
if (process.env.NODE_ENV !== 'test') {
  // Check for due reminders every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('Running reminder check...');
      await reminderService.checkAndSendReminders();
    } catch (error) {
      console.error('Reminder check error:', error);
    }
  });

  // Daily summary email at 8 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('Sending daily summaries...');
      await reminderService.sendDailySummaries();
    } catch (error) {
      console.error('Daily summary error:', error);
    }
  });

  console.log('Cron jobs initialized');
}

// 404 handler
app.use('*', (req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    return errorResponse(res, 'Validation failed', 400, errors);
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  return errorResponse(res, message, statusCode);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 3003;

const server = app.listen(PORT, () => {
  console.log(`Notification service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;