# TaskTrackr Deployment Guide

This guide covers deploying TaskTrackr to production environments.

## 🚀 Production Deployment Options

### Option 1: Render + Netlify (Recommended)

#### Backend Services (Render)
1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Deploy Auth Service**:
   ```bash
   # Connect your GitHub repository
   # Service Type: Web Service
   # Build Command: cd auth-service && npm install
   # Start Command: cd auth-service && npm start
   ```

3. **Deploy Task Service**:
   ```bash
   # Service Type: Web Service
   # Build Command: cd task-service && npm install
   # Start Command: cd task-service && npm start
   ```

4. **Deploy Notification Service**:
   ```bash
   # Service Type: Web Service
   # Build Command: cd notification-service && npm install
   # Start Command: cd notification-service && npm start
   ```

#### Frontend (Netlify)
1. **Create Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Deploy Client**:
   ```bash
   # Build Command: cd client && npm run build
   # Publish Directory: client/build
   ```

### Option 2: Railway Deployment

#### Deploy to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy each service
railway up --service auth-service
railway up --service task-service
railway up --service notification-service
```

### Option 3: Docker + VPS

#### Using Docker Compose
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# With custom environment
docker-compose --env-file .env.production up -d
```

## 🔧 Environment Configuration

### Production Environment Variables

#### Shared Variables
```env
NODE_ENV=production
JWT_SECRET=your-super-secure-production-jwt-secret-minimum-256-bits
```

#### Database (MongoDB Atlas)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tasktrackr?retryWrites=true&w=majority
```

#### Auth Service
```env
PORT=3001
REDIS_URL=redis://your-redis-instance:6379
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
CLIENT_URL=https://your-frontend-domain.com
```

#### Task Service
```env
PORT=3002
CLOUDINARY_CLOUD_NAME=your-production-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
MAX_FILE_SIZE=10485760
AUTH_SERVICE_URL=https://your-auth-service.onrender.com
```

#### Notification Service
```env
PORT=3003
CLIENT_URL=https://your-frontend-domain.com
AUTH_SERVICE_URL=https://your-auth-service.onrender.com
TASK_SERVICE_URL=https://your-task-service.onrender.com
REMINDER_CRON_SCHEDULE=*/5 * * * *
```

#### Frontend (React)
```env
REACT_APP_AUTH_SERVICE_URL=https://your-auth-service.onrender.com
REACT_APP_TASK_SERVICE_URL=https://your-task-service.onrender.com
REACT_APP_NOTIFICATION_SERVICE_URL=https://your-notification-service.onrender.com
```

## 🗄️ Database Setup

### MongoDB Atlas Setup
1. **Create Atlas Account**: [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Create Cluster**: Choose your preferred region
3. **Configure Access**:
   ```bash
   # Add IP addresses: 0.0.0.0/0 (for development)
   # In production, use specific IP ranges
   ```
4. **Create Database User**:
   ```bash
   # Username: tasktrackr-prod
   # Password: Generate secure password
   # Permissions: Read and write to any database
   ```

### Database Indexes (Run once)
```javascript
// Connect to MongoDB and run these commands
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });
db.tasks.createIndex({ "userId": 1, "status": 1 });
db.tasks.createIndex({ "userId": 1, "dueDate": 1 });
db.tasks.createIndex({ "reminder.datetime": 1, "reminder.enabled": 1 });
```

## 📧 Email Service Setup

### SendGrid Setup (Recommended)
1. **Create SendGrid Account**: [sendgrid.com](https://sendgrid.com)
2. **Generate API Key**:
   ```bash
   # Go to Settings > API Keys
   # Create API Key with "Full Access"
   # Copy the key to EMAIL_PASS environment variable
   ```
3. **Verify Domain**: Add your domain for better deliverability

### Gmail Setup (Development)
1. **Enable 2FA**: On your Google account
2. **Generate App Password**:
   ```bash
   # Go to Google Account Settings
   # Security > 2-Step Verification > App passwords
   # Generate password for "Mail"
   ```

## ☁️ File Storage Setup

### Cloudinary Setup
1. **Create Account**: [cloudinary.com](https://cloudinary.com)
2. **Get Credentials**:
   ```bash
   # Dashboard > Account Details
   # Copy Cloud Name, API Key, API Secret
   ```
3. **Configure Upload Presets**:
   ```bash
   # Settings > Upload > Upload presets
   # Create preset: tasktrackr-attachments
   # Mode: Unsigned
   ```

## 🔄 Redis Setup (Optional)

### Redis Cloud
1. **Create Account**: [redislabs.com](https://redislabs.com)
2. **Create Database**:
   ```bash
   # Choose plan and region
   # Get connection string
   ```

### Local Redis (Development)
```bash
# Install Redis
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
```

## 🔒 Security Checklist

### Pre-deployment Security
- [ ] Change all default passwords
- [ ] Use strong JWT secrets (minimum 256 bits)
- [ ] Enable HTTPS for all services
- [ ] Configure CORS for production domains only
- [ ] Set up rate limiting
- [ ] Validate all environment variables
- [ ] Remove debug logs from production
- [ ] Set up monitoring and alerting

### Production Security Headers
```javascript
// Already configured in helmet.js
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

## 📊 Monitoring & Logging

### Application Monitoring
```bash
# Add to package.json
npm install --save winston
npm install --save @sentry/node
```

### Health Checks
Each service includes health check endpoints:
```bash
GET /health
# Returns: { success: true, message: "Service is healthy" }
```

### Log Aggregation
```bash
# Production logging with Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## 🧪 Testing Deployment

### Smoke Tests
```bash
# Test all endpoints
curl https://your-auth-service.onrender.com/health
curl https://your-task-service.onrender.com/health
curl https://your-notification-service.onrender.com/health
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Run load tests
artillery quick --count 100 --num 10 https://your-api.com/api/tasks
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        run: |
          # Trigger Render deployment
          curl -X POST ${{ secrets.RENDER_WEBHOOK_URL }}
```

## 🆘 Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check connection string format
mongodb+srv://username:password@cluster.mongodb.net/database

# Test connection
mongosh "mongodb+srv://cluster.mongodb.net" --username username
```

#### CORS Issues
```bash
# Add frontend domain to CORS whitelist
const corsOptions = {
  origin: ['https://your-frontend-domain.com'],
  credentials: true
};
```

#### File Upload Issues
```bash
# Check Cloudinary credentials
# Verify file size limits
# Test upload endpoint directly
```

### Performance Optimization
```bash
# Enable compression
npm install compression
app.use(compression());

# Add Redis caching
npm install redis
# Cache frequently accessed data
```

## 📞 Support

For deployment issues:
1. Check service logs in your hosting provider
2. Verify all environment variables
3. Test database connectivity
4. Check API endpoint responses
5. Review CORS configuration

## 🎯 Post-Deployment

### Domain Setup
1. **Custom Domain**: Configure in Netlify/Vercel
2. **SSL Certificate**: Automatically provided by hosting services
3. **CDN**: Already included with Netlify/Vercel

### Analytics
```bash
# Add Google Analytics to React app
npm install react-ga4

# Add to public/index.html
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
```

### Backup Strategy
1. **Database**: MongoDB Atlas automatic backups
2. **Files**: Cloudinary automatic backups
3. **Code**: GitHub repository

---

Your TaskTrackr application is now ready for production! 🚀