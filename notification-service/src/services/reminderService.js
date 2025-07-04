const { Task, User } = require('@tasktrackr/common');
const { sendEmail } = require('./emailService');

/**
 * Check for tasks with reminders and send notifications
 */
const checkReminders = async () => {
  try {
    const now = new Date();
    
    // Find tasks with reminders that should be sent
    const tasksWithReminders = await Task.find({
      'reminder.enabled': true,
      'reminder.sent': false,
      'reminder.datetime': { $lte: now },
      status: { $ne: 'completed' },
      isArchived: false
    }).populate('userId', 'name email preferences');

    console.log(`Found ${tasksWithReminders.length} tasks with pending reminders`);

    for (const task of tasksWithReminders) {
      try {
        await sendTaskReminder(task);
        
        // Mark reminder as sent
        task.reminder.sent = true;
        await task.save();
        
        console.log(`Reminder sent for task: ${task.title}`);
      } catch (error) {
        console.error(`Failed to send reminder for task ${task._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error checking reminders:', error);
  }
};

/**
 * Send reminder for a specific task
 */
const sendTaskReminder = async (task) => {
  try {
    const user = task.userId;
    
    if (!user || !user.email) {
      throw new Error('User email not found');
    }

    // Check user notification preferences
    if (!user.preferences?.notifications?.email) {
      console.log(`Email notifications disabled for user ${user._id}`);
      return;
    }

    // Format due date for email
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
    
    const emailData = {
      to: user.email,
      subject: isOverdue ? 
        `⚠️ Overdue Task Reminder: ${task.title}` : 
        `🔔 Task Reminder: ${task.title}`,
      template: 'taskReminder',
      data: {
        userName: user.name,
        taskTitle: task.title,
        taskDescription: task.description || 'No description',
        dueDate: dueDate,
        priority: task.priority,
        isOverdue: isOverdue,
        taskUrl: `${process.env.CLIENT_URL}/tasks/${task._id}`
      }
    };

    await sendEmail(emailData);
  } catch (error) {
    console.error('Send task reminder error:', error);
    throw error;
  }
};

/**
 * Send daily digest of tasks
 */
const sendDailyDigest = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.preferences?.notifications?.email) {
      return;
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get tasks due today and tomorrow
    const [dueTodayTasks, dueTomorrowTasks, overdueTasks] = await Promise.all([
      Task.find({
        userId,
        dueDate: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999))
        },
        status: { $ne: 'completed' },
        isArchived: false
      }),
      Task.find({
        userId,
        dueDate: {
          $gte: new Date(tomorrow.setHours(0, 0, 0, 0)),
          $lt: new Date(tomorrow.setHours(23, 59, 59, 999))
        },
        status: { $ne: 'completed' },
        isArchived: false
      }),
      Task.find({
        userId,
        dueDate: { $lt: today },
        status: { $ne: 'completed' },
        isArchived: false
      })
    ]);

    if (dueTodayTasks.length === 0 && dueTomorrowTasks.length === 0 && overdueTasks.length === 0) {
      return; // No tasks to report
    }

    const emailData = {
      to: user.email,
      subject: '📅 Daily Task Digest - TaskTrackr',
      template: 'dailyDigest',
      data: {
        userName: user.name,
        dueTodayTasks,
        dueTomorrowTasks,
        overdueTasks,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard`
      }
    };

    await sendEmail(emailData);
  } catch (error) {
    console.error('Send daily digest error:', error);
    throw error;
  }
};

/**
 * Send weekly summary
 */
const sendWeeklyummary = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.preferences?.notifications?.email) {
      return;
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [completedTasks, totalTasks] = await Promise.all([
      Task.countDocuments({
        userId,
        status: 'completed',
        completedAt: { $gte: weekAgo },
        isArchived: false
      }),
      Task.countDocuments({
        userId,
        createdAt: { $gte: weekAgo },
        isArchived: false
      })
    ]);

    const emailData = {
      to: user.email,
      subject: '📊 Weekly Summary - TaskTrackr',
      template: 'weeklySummary',
      data: {
        userName: user.name,
        completedTasks,
        totalTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard`
      }
    };

    await sendEmail(emailData);
  } catch (error) {
    console.error('Send weekly summary error:', error);
    throw error;
  }
};

module.exports = {
  checkReminders,
  sendTaskReminder,
  sendDailyDigest,
  sendWeeklyummary
};