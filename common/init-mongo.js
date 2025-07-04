// MongoDB initialization script for Docker
// This script runs when the MongoDB container starts for the first time

db = db.getSiblingDB('tasktrackr');

// Create collections with proper indexing
db.createCollection('users');
db.createCollection('tasks');

// Create indexes for users collection
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "createdAt": -1 });
db.users.createIndex({ "role": 1 });

// Create indexes for tasks collection
db.tasks.createIndex({ "userId": 1 });
db.tasks.createIndex({ "userId": 1, "status": 1 });
db.tasks.createIndex({ "userId": 1, "dueDate": 1 });
db.tasks.createIndex({ "userId": 1, "createdAt": -1 });
db.tasks.createIndex({ "reminder.reminderDate": 1, "reminder.enabled": 1 });
db.tasks.createIndex({ "dueDate": 1, "status": 1 });
db.tasks.createIndex({ "tags": 1 });
db.tasks.createIndex({ "category": 1 });
db.tasks.createIndex({ "priority": 1 });

// Create a sample admin user (optional - remove in production)
const adminUser = {
  name: "Admin User",
  email: "admin@tasktrackr.com",
  password: "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewCCE6/0GebAsyT2", // password: admin123
  role: "admin",
  isEmailVerified: true,
  preferences: {
    theme: "auto",
    notifications: {
      email: true,
      push: true,
      reminderMinutes: 15
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

// Insert admin user if it doesn't exist
const existingAdmin = db.users.findOne({ email: "admin@tasktrackr.com" });
if (!existingAdmin) {
  db.users.insertOne(adminUser);
  print("Admin user created: admin@tasktrackr.com (password: admin123)");
}

print("TaskTrackr database initialized successfully!");
print("Created collections: users, tasks");
print("Created indexes for optimal performance");

// Set up any additional configuration
db.runCommand({
  collMod: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "password", "role"],
      properties: {
        name: {
          bsonType: "string",
          minLength: 2,
          maxLength: 50
        },
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        },
        role: {
          enum: ["user", "admin"]
        }
      }
    }
  },
  validationLevel: "moderate"
});

db.runCommand({
  collMod: "tasks",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "title", "status"],
      properties: {
        title: {
          bsonType: "string",
          minLength: 1,
          maxLength: 200
        },
        status: {
          enum: ["pending", "in-progress", "completed", "cancelled"]
        },
        priority: {
          enum: ["low", "medium", "high", "urgent"]
        }
      }
    }
  },
  validationLevel: "moderate"
});

print("Database validation rules applied!");