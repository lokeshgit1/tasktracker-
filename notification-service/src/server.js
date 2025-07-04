require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cron = require('node-cron');

const { connectDB, errorResponse } = require('@tasktrackr/common');
const notificationRoutes = require('./routes/notifications');
const { checkReminders } = require('./services/reminderService');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3003;

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://tasktrackr.vercel.app', 'https://tasktrackr.netlify.app']
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Notification service is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use('*', (req, res) => {
  errorResponse(res, `Route ${req.originalUrl} not found`, 404);
});

// Error handling middleware
app.use(errorHandler);

// Schedule reminder checks (every minute)
cron.schedule('* * * * *', async () => {
  try {
    await checkReminders();
  } catch (error) {
    console.error('Reminder check error:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
  console.log('Reminder scheduler started - checking every minute');
});