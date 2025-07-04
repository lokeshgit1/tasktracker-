const { Task, User } = require('@tasktrackr/common');
const emailService = require('./emailService');

class ReminderService {
  /**
   * Check for due reminders and send notifications
   */
  async checkAndSendReminders() {
    try {
      console.log('Checking for due reminders...');
      
      const now = new Date();
      const reminderWindow = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes ahead

      // Find tasks with due reminders that haven't been sent
      const tasksWithReminders = await Task.find({
        'reminder.enabled': true,
        'reminder.notified': false,
        'reminder.reminderDate': {
          $lte: reminderWindow
        },
        status: { $in: ['pending', 'in-progress'] },
        isArchived: false
      }).populate('userId', 'name email preferences');

      console.log(`Found ${tasksWithReminders.length} tasks with due reminders`);

      const reminderPromises = tasksWithReminders.map(async (task) => {
        try {
          const user = task.userId;
          
          // Check if user wants email notifications
          if (user.preferences?.notifications?.email !== false) {
            await emailService.sendTaskReminder(user, task);
          }

          // Mark reminder as sent
          task.reminder.notified = true;
          await task.save();
          
          console.log(`Reminder sent for task: ${task.title} to ${user.email}`);
        } catch (error) {
          console.error(`Failed to send reminder for task ${task._id}:`, error);
        }
      });

      await Promise.allSettled(reminderPromises);
      
      console.log('Reminder check completed');
    } catch (error) {
      console.error('Error in checkAndSendReminders:', error);
    }
  }

  /**
   * Send daily summary emails to users
   */
  async sendDailySummaries() {
    try {
      console.log('Sending daily summaries...');

      // Get users who want daily summaries
      const users = await User.find({
        'preferences.notifications.email': { $ne: false }
      });

      console.log(`Sending daily summaries to ${users.length} users`);

      const summaryPromises = users.map(async (user) => {
        try {
          const summary = await this.generateUserSummary(user._id);
          
          // Only send if user has tasks
          if (summary.totalTasks > 0) {
            await emailService.sendDailySummary(user, summary);
            console.log(`Daily summary sent to ${user.email}`);
          }
        } catch (error) {
          console.error(`Failed to send daily summary to ${user.email}:`, error);
        }
      });

      await Promise.allSettled(summaryPromises);
      
      console.log('Daily summaries completed');
    } catch (error) {
      console.error('Error in sendDailySummaries:', error);
    }
  }

  /**
   * Generate task summary for a user
   */
  async generateUserSummary(userId) {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const [
        totalTasks,
        completedTasks,
        pendingTasks,
        inProgressTasks,
        overdueTasks,
        todayTasks,
        upcomingTasks
      ] = await Promise.all([
        // Total active tasks
        Task.countDocuments({
          userId,
          isArchived: false
        }),
        
        // Completed tasks
        Task.countDocuments({
          userId,
          status: 'completed',
          isArchived: false
        }),
        
        // Pending tasks
        Task.countDocuments({
          userId,
          status: 'pending',
          isArchived: false
        }),
        
        // In progress tasks
        Task.countDocuments({
          userId,
          status: 'in-progress',
          isArchived: false
        }),
        
        // Overdue tasks
        Task.countDocuments({
          userId,
          dueDate: { $lt: today },
          status: { $in: ['pending', 'in-progress'] },
          isArchived: false
        }),
        
        // Tasks due today
        Task.countDocuments({
          userId,
          dueDate: {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lt: new Date(today.setHours(23, 59, 59, 999))
          },
          status: { $in: ['pending', 'in-progress'] },
          isArchived: false
        }),
        
        // Upcoming tasks (next 7 days)
        Task.find({
          userId,
          dueDate: {
            $gte: tomorrow,
            $lte: nextWeek
          },
          status: { $in: ['pending', 'in-progress'] },
          isArchived: false
        })
        .select('title dueDate priority')
        .sort({ dueDate: 1 })
        .limit(5)
      ]);

      return {
        totalTasks,
        completedTasks,
        pendingTasks: pendingTasks + inProgressTasks,
        overdueTasks,
        todayTasks,
        upcomingTasks: upcomingTasks || [],
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      };
    } catch (error) {
      console.error('Error generating user summary:', error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        overdueTasks: 0,
        todayTasks: 0,
        upcomingTasks: [],
        completionRate: 0
      };
    }
  }

  /**
   * Send overdue task alerts
   */
  async sendOverdueAlerts() {
    try {
      console.log('Checking for overdue tasks...');

      const overdueTasksAggregation = await Task.aggregate([
        {
          $match: {
            dueDate: { $lt: new Date() },
            status: { $in: ['pending', 'in-progress'] },
            isArchived: false
          }
        },
        {
          $group: {
            _id: '$userId',
            tasks: { $push: '$$ROOT' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $match: {
            'user.preferences.notifications.email': { $ne: false }
          }
        }
      ]);

      console.log(`Found overdue tasks for ${overdueTasksAggregation.length} users`);

      const alertPromises = overdueTasksAggregation.map(async (userGroup) => {
        try {
          const user = userGroup.user;
          const overdueTasks = userGroup.tasks;

          await emailService.sendOverdueAlert(user, overdueTasks);
          console.log(`Overdue alert sent to ${user.email} for ${overdueTasks.length} tasks`);
        } catch (error) {
          console.error(`Failed to send overdue alert to user ${userGroup._id}:`, error);
        }
      });

      await Promise.allSettled(alertPromises);
      
      console.log('Overdue alerts completed');
    } catch (error) {
      console.error('Error in sendOverdueAlerts:', error);
    }
  }

  /**
   * Schedule a reminder for a task
   */
  async scheduleReminder(taskId, reminderDate) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      task.reminder.enabled = true;
      task.reminder.reminderDate = reminderDate;
      task.reminder.notified = false;

      await task.save();
      
      console.log(`Reminder scheduled for task ${task.title} at ${reminderDate}`);
      
      return {
        success: true,
        message: 'Reminder scheduled successfully',
        reminderDate
      };
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return {
        success: false,
        message: 'Failed to schedule reminder',
        error: error.message
      };
    }
  }

  /**
   * Cancel a reminder for a task
   */
  async cancelReminder(taskId) {
    try {
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      task.reminder.enabled = false;
      task.reminder.notified = false;
      task.reminder.reminderDate = null;

      await task.save();
      
      console.log(`Reminder cancelled for task ${task.title}`);
      
      return {
        success: true,
        message: 'Reminder cancelled successfully'
      };
    } catch (error) {
      console.error('Error cancelling reminder:', error);
      return {
        success: false,
        message: 'Failed to cancel reminder',
        error: error.message
      };
    }
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats() {
    try {
      const [
        totalReminders,
        activeReminders,
        sentReminders,
        overdueReminders
      ] = await Promise.all([
        Task.countDocuments({ 'reminder.enabled': true }),
        Task.countDocuments({ 
          'reminder.enabled': true,
          'reminder.notified': false 
        }),
        Task.countDocuments({ 
          'reminder.enabled': true,
          'reminder.notified': true 
        }),
        Task.countDocuments({
          'reminder.enabled': true,
          'reminder.reminderDate': { $lt: new Date() },
          'reminder.notified': false
        })
      ]);

      return {
        totalReminders,
        activeReminders,
        sentReminders,
        overdueReminders,
        reminderEfficiency: totalReminders > 0 
          ? Math.round((sentReminders / totalReminders) * 100) 
          : 0
      };
    } catch (error) {
      console.error('Error getting reminder stats:', error);
      return {
        totalReminders: 0,
        activeReminders: 0,
        sentReminders: 0,
        overdueReminders: 0,
        reminderEfficiency: 0
      };
    }
  }
}

module.exports = new ReminderService();