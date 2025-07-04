require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const { connectDB, errorResponse } = require('@tasktrackr/common');
const taskRoutes = require('./routes/tasks');
const attachmentRoutes = require('./routes/attachments');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3002;

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

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

// Swagger documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskTrackr Task Service API',
      version: '1.0.0',
      description: 'Task management and file attachment service for TaskTrackr',
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://tasktrackr-tasks.onrender.com'
          : `http://localhost:${PORT}`,
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Task service is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/attachments', attachmentRoutes);

// 404 handler
app.use('*', (req, res) => {
  errorResponse(res, `Route ${req.originalUrl} not found`, 404);
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Task Service running on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/api/docs`);
});