const nodemailer = require('nodemailer');

// Email templates
const emailTemplates = {
  taskReminder: (data) => ({
    subject: data.isOverdue ? 
      `⚠️ Overdue Task Reminder: ${data.taskTitle}` : 
      `🔔 Task Reminder: ${data.taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: ${data.isOverdue ? '#dc2626' : '#2563eb'};">
          ${data.isOverdue ? '⚠️ Overdue Task' : '🔔 Task Reminder'}
        </h1>
        <p>Hi ${data.userName},</p>
        <p>This is a reminder about your task:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin: 0 0 10px 0; color: #374151;">${data.taskTitle}</h2>
          <p style="margin: 5px 0; color: #6b7280;">${data.taskDescription}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> ${data.dueDate}</p>
          <p style="margin: 5px 0;"><strong>Priority:</strong> <span style="text-transform: capitalize;">${data.priority}</span></p>
        </div>
        
        ${data.isOverdue ? 
          '<p style="color: #dc2626;"><strong>This task is overdue!</strong> Please complete it as soon as possible.</p>' :
          '<p>Don\'t forget to mark it as complete when you\'re done!</p>'
        }
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.taskUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Task</a>
        </div>
        
        <p>Best regards,<br>The TaskTrackr Team</p>
      </div>
    `
  }),

  dailyDigest: (data) => ({
    subject: '📅 Daily Task Digest - TaskTrackr',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">📅 Daily Task Digest</h1>
        <p>Hi ${data.userName},</p>
        <p>Here's your daily task summary:</p>
        
        ${data.overdueTasks.length > 0 ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0;">⚠️ Overdue Tasks (${data.overdueTasks.length})</h3>
            <ul>
              ${data.overdueTasks.map(task => `<li>${task.title}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${data.dueTodayTasks.length > 0 ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <h3 style="color: #f59e0b; margin: 0 0 10px 0;">📅 Due Today (${data.dueTodayTasks.length})</h3>
            <ul>
              ${data.dueTodayTasks.map(task => `<li>${task.title}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${data.dueTomorrowTasks.length > 0 ? `
          <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <h3 style="color: #3b82f6; margin: 0 0 10px 0;">🔜 Due Tomorrow (${data.dueTomorrowTasks.length})</h3>
            <ul>
              ${data.dueTomorrowTasks.map(task => `<li>${task.title}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
        </div>
        
        <p>Stay productive!</p>
        <p>The TaskTrackr Team</p>
      </div>
    `
  }),

  weeklySummary: (data) => ({
    subject: '📊 Weekly Summary - TaskTrackr',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">📊 Weekly Summary</h1>
        <p>Hi ${data.userName},</p>
        <p>Here's how you did this week:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h2 style="margin: 0 0 20px 0; color: #374151;">Your Week in Numbers</h2>
          <div style="display: flex; justify-content: space-around; margin: 20px 0;">
            <div>
              <h3 style="color: #059669; margin: 0; font-size: 2em;">${data.completedTasks}</h3>
              <p style="margin: 5px 0; color: #6b7280;">Tasks Completed</p>
            </div>
            <div>
              <h3 style="color: #3b82f6; margin: 0; font-size: 2em;">${data.totalTasks}</h3>
              <p style="margin: 5px 0; color: #6b7280;">Total Tasks</p>
            </div>
            <div>
              <h3 style="color: #8b5cf6; margin: 0; font-size: 2em;">${data.completionRate}%</h3>
              <p style="margin: 5px 0; color: #6b7280;">Completion Rate</p>
            </div>
          </div>
        </div>
        
        ${data.completionRate >= 80 ? 
          '<p style="color: #059669;"><strong>🎉 Excellent work!</strong> You had a very productive week!</p>' :
          data.completionRate >= 60 ?
          '<p style="color: #f59e0b;"><strong>👍 Good job!</strong> Keep up the momentum!</p>' :
          '<p style="color: #3b82f6;"><strong>💪 Keep going!</strong> Every task completed is progress!</p>'
        }
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a>
        </div>
        
        <p>Here's to another productive week!</p>
        <p>The TaskTrackr Team</p>
      </div>
    `
  })
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send email using the specified template
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    let emailContent = {};

    if (options.template && emailTemplates[options.template]) {
      emailContent = emailTemplates[options.template](options.data || {});
    } else {
      emailContent = {
        subject: options.subject,
        html: options.html,
        text: options.text
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject || emailContent.subject,
      html: emailContent.html,
      text: emailContent.text || emailContent.html?.replace(/<[^>]*>/g, '') // Strip HTML for text version
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;

  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

module.exports = {
  sendEmail,
  emailTemplates
};