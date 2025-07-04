# 📊 TaskTrackr - Comprehensive MERN Stack Task Manager

## 🚀 Project Overview

TaskTrackr is a **production-ready, offline-first, cross-platform personal and team task manager** built with the MERN stack. It features file attachments, reminders, progress tracking, and a microservices-ready architecture.

### ✨ Key Features Implemented

- **🔐 JWT-Based Authentication** with refresh tokens
- **📝 Complete Task CRUD** with advanced filtering and search
- **📎 File Attachments** with Cloudinary/local storage support
- **📧 Email Notifications** with customizable templates
- **⏰ Automated Reminders** via cron jobs
- **🔍 Advanced Search & Filtering** with pagination
- **👥 Role-Based Access Control** (User/Admin)
- **📊 Task Statistics & Analytics**
- **🔄 Bulk Operations** for tasks and attachments
- **📱 PWA-Ready** architecture
- **🐳 Docker Support** with Docker Compose
- **🎯 Microservices Architecture**

## 🏗️ Architecture

### Project Structure
```
/tasktrackr/
├── 📁 common/                  # Shared utilities & models
│   ├── models/                 # MongoDB schemas (User, Task)
│   ├── middleware/             # Auth middleware
│   ├── utils/                  # JWT, validation, response utilities
│   └── index.js               # Exports all common modules
├── 📁 auth-service/           # Authentication & user management
│   ├── routes/                # Auth & user routes
│   ├── server.js              # Express server
│   └── Dockerfile             # Container configuration
├── 📁 task-service/           # Task CRUD & file management
│   ├── routes/                # Task & attachment routes
│   ├── server.js              # Express server
│   └── Dockerfile             # Container configuration
├── 📁 notification-service/   # Email & reminder service
│   ├── routes/                # Notification routes
│   ├── services/              # Email & reminder services
│   ├── server.js              # Express server with cron jobs
│   └── Dockerfile             # Container configuration
├── 📁 client/                 # React PWA frontend (planned)
├── 📄 docker-compose.yml      # Complete orchestration
└── 📄 package.json           # Workspace configuration
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React + TailwindCSS + PWA |
| **Backend** | Node.js + Express + MongoDB |
| **Authentication** | JWT with refresh tokens |
| **File Storage** | Cloudinary / Local storage |
| **Email** | NodeMailer with HTML templates |
| **Database** | MongoDB with Mongoose ODM |
| **Caching** | Redis (rate limiting & sessions) |
| **Containerization** | Docker + Docker Compose |
| **API Documentation** | Swagger/OpenAPI ready |

## � Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- MongoDB (or use Docker)
- Redis (optional, for production)

### 1. Environment Setup

Create `.env` files in each service directory:

**auth-service/.env**
```env
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://admin:password123@localhost:27017/tasktrackr?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-256-bit
JWT_REFRESH_SECRET=your-refresh-secret-256-bit
ALLOWED_ORIGINS=http://localhost:3000
```

**task-service/.env**
```env
NODE_ENV=development
PORT=3002
MONGODB_URI=mongodb://admin:password123@localhost:27017/tasktrackr?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-256-bit
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret
```

**notification-service/.env**
```env
NODE_ENV=development
PORT=3003
MONGODB_URI=mongodb://admin:password123@localhost:27017/tasktrackr?authSource=admin
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:3000
```

### 2. Installation & Startup

```bash
# Install all dependencies
npm run install:all

# Start with Docker Compose (recommended)
docker-compose up -d

# Or start services individually
npm run dev
```

### 3. Access Points

- **Auth Service**: http://localhost:3001
- **Task Service**: http://localhost:3002  
- **Notification Service**: http://localhost:3003
- **Frontend**: http://localhost:3000 (when implemented)
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 📡 API Documentation

### Authentication Service (Port 3001)

#### Auth Endpoints
```http
POST /api/auth/register      # Register new user
POST /api/auth/login         # User login
POST /api/auth/refresh       # Refresh access token
POST /api/auth/logout        # User logout
POST /api/auth/forgot-password  # Password reset request
POST /api/auth/reset-password   # Reset password with token
POST /api/auth/change-password  # Change password (authenticated)
GET  /api/auth/me           # Get current user profile
POST /api/auth/verify-token # Verify token validity
```

#### User Management
```http
GET  /api/user/profile      # Get user profile
PUT  /api/user/profile      # Update profile
PUT  /api/user/preferences  # Update preferences
DELETE /api/user/account    # Delete account
```

#### Admin Endpoints
```http
GET  /api/user/admin/users     # Get all users (paginated)
GET  /api/user/admin/users/:id # Get user by ID
PUT  /api/user/admin/users/:id # Update user
DELETE /api/user/admin/users/:id # Delete user
GET  /api/user/admin/stats     # User statistics
```

### Task Service (Port 3002)

#### Task CRUD
```http
GET  /api/tasks             # Get user tasks (with filters)
GET  /api/tasks/:id         # Get task by ID
POST /api/tasks             # Create new task
PUT  /api/tasks/:id         # Update task
DELETE /api/tasks/:id       # Delete task
```

#### Task Operations
```http
PATCH /api/tasks/:id/status    # Update task status
PATCH /api/tasks/:id/archive   # Archive/unarchive task
POST  /api/tasks/bulk-update   # Bulk update tasks
DELETE /api/tasks/bulk-delete  # Bulk delete tasks
GET   /api/tasks/overdue       # Get overdue tasks
GET   /api/tasks/stats         # Task statistics
```

#### File Attachments
```http
POST /api/attachments/upload/:taskId        # Upload files
GET  /api/attachments/:taskId               # Get attachments
GET  /api/attachments/download/:taskId/:id  # Download file
DELETE /api/attachments/:taskId/:id         # Delete attachment
POST /api/attachments/bulk-delete/:taskId   # Bulk delete
GET  /api/attachments/stats/:taskId         # Attachment stats
```

### Notification Service (Port 3003)

#### Email & Notifications
```http
POST /api/email/send              # Send custom email
POST /api/email/welcome          # Send welcome email
POST /api/email/reminder         # Send task reminder
POST /api/email/password-reset   # Send password reset
GET  /api/notifications/health   # Service health check
```

## �️ Database Models

### User Model
```javascript
{
  name: String (required),
  email: String (unique, required),
  password: String (hashed),
  role: 'user' | 'admin',
  avatar: String,
  isEmailVerified: Boolean,
  lastLogin: Date,
  preferences: {
    theme: 'light' | 'dark' | 'auto',
    notifications: {
      email: Boolean,
      push: Boolean,
      reminderMinutes: Number
    }
  }
}
```

### Task Model
```javascript
{
  userId: ObjectId (required),
  title: String (required),
  description: String,
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  dueDate: Date,
  completedAt: Date,
  category: String,
  tags: [String],
  estimatedDuration: Number,
  actualDuration: Number,
  isArchived: Boolean,
  attachments: [{
    filename: String,
    originalName: String,
    url: String,
    size: Number,
    mimeType: String,
    uploadedAt: Date
  }],
  reminder: {
    enabled: Boolean,
    reminderDate: Date,
    notified: Boolean
  }
}
```

## � Advanced Features

### File Upload System
- **Dual Storage**: Cloudinary (cloud) or local filesystem
- **Image Optimization**: Automatic resizing with Sharp
- **File Type Validation**: Supports images, PDFs, documents
- **Size Limits**: 10MB per file, 5 files per request
- **Bulk Operations**: Upload/delete multiple files

### Email System
- **Template Engine**: Handlebars with fallback templates
- **Multiple Providers**: NodeMailer with SMTP support
- **Email Types**: Welcome, reminders, password reset, daily summary
- **Rate Limiting**: Prevents spam and abuse

### Security Features
- **JWT Authentication**: Access + refresh token pattern
- **Rate Limiting**: Per-endpoint limits
- **Input Validation**: Joi schemas for all inputs
- **CORS Configuration**: Environment-specific origins
- **Helmet Security**: Standard security headers
- **Password Hashing**: BCrypt with salt rounds

### Automated Tasks
- **Reminder System**: Cron job checks every 5 minutes
- **Daily Summaries**: Automated at 8 AM daily
- **Overdue Alerts**: Configurable notifications
- **Email Queue**: Background processing ready

## 🐳 Docker Deployment

### Production Setup
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  auth-service:
    build: ./auth-service
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
    restart: unless-stopped
  
  task-service:
    build: ./task-service
    environment:
      - NODE_ENV=production
      - CLOUDINARY_CLOUD_NAME=${CLOUDINARY_CLOUD_NAME}
    restart: unless-stopped
    
  notification-service:
    build: ./notification-service
    environment:
      - NODE_ENV=production
      - EMAIL_HOST=${EMAIL_HOST}
    restart: unless-stopped
```

### Health Checks
All services include health check endpoints:
- `/api/auth/health` - Auth service status
- `/api/tasks/health` - Task service status  
- `/api/notifications/health` - Notification service status

## � Performance & Monitoring

### Database Optimization
- **Indexes**: Optimized queries for users and tasks
- **Connection Pooling**: Mongoose with connection limits
- **Query Optimization**: Efficient aggregation pipelines

### Rate Limiting
- **Global Limits**: 100-1000 requests per 15 minutes
- **Auth Limits**: 20 requests per 15 minutes
- **Email Limits**: 50 emails per hour
- **Upload Limits**: 50 uploads per 15 minutes

### Monitoring Ready
- **Health Endpoints**: All services provide status
- **Error Logging**: Comprehensive error handling
- **Request Logging**: Morgan middleware
- **Uptime Tracking**: Built-in uptime metrics

## 🔄 Frontend Implementation Plan

### React Client Structure (Next Phase)
```
/client/
├── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                 # Service worker
├── src/
│   ├── components/           # Reusable UI components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API services
│   ├── context/             # React Context providers
│   ├── utils/               # Utility functions
│   └── App.js               # Main application
```

### Key Frontend Features
- **PWA Support**: Offline functionality with service workers
- **Modern UI**: TailwindCSS with responsive design
- **State Management**: React Context + useReducer
- **Authentication**: JWT token management
- **File Upload**: Drag & drop with progress indicators
- **Real-time Updates**: WebSocket integration ready
- **Dark/Light Theme**: User preference based

## 🚀 Deployment Options

### Cloud Platforms
- **Backend**: Railway, Render, DigitalOcean
- **Frontend**: Netlify, Vercel, Surge
- **Database**: MongoDB Atlas
- **File Storage**: Cloudinary, AWS S3
- **Email**: SendGrid, Mailgun, AWS SES

### Environment Variables
Comprehensive `.env.example` files provided for each service with all necessary configuration options.

## 🔮 Future Enhancements

### Phase 2 Features
- **Team Collaboration**: Shared tasks and projects
- **Real-time Notifications**: WebSocket implementation
- **Mobile App**: React Native version
- **Advanced Analytics**: Task completion insights
- **API Gateway**: Centralized routing and auth
- **GraphQL**: Unified API layer
- **Microservices**: Event-driven architecture

### Integration Possibilities
- **Calendar Sync**: Google Calendar, Outlook
- **Third-party APIs**: Slack, Discord, Trello
- **AI Features**: Smart task categorization
- **Time Tracking**: Detailed productivity analytics

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Update documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**TaskTrackr** - Built with ❤️ using the MERN stack. A production-ready task management solution with enterprise-grade features and microservices architecture.