const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.configured = false;
  }

  /**
   * Initialize email service with transporter and templates
   */
  async initialize() {
    try {
      await this.setupTransporter();
      await this.loadTemplates();
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Email service initialization error:', error);
    }
  }

  /**
   * Setup email transporter
   */
  async setupTransporter() {
    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    };

    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('Email credentials not configured. Email service will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransporter(emailConfig);

    // Verify connection
    try {
      await this.transporter.verify();
      this.configured = true;
      console.log('Email transporter verified successfully');
    } catch (error) {
      console.error('Email transporter verification failed:', error);
    }
  }

  /**
   * Load email templates
   */
  async loadTemplates() {
    const templatesDir = path.join(__dirname, '../templates');
    
    try {
      const templateFiles = [
        'welcome.html',
        'task-reminder.html',
        'password-reset.html',
        'daily-summary.html',
        'task-overdue.html'
      ];

      for (const templateFile of templateFiles) {
        try {
          const templatePath = path.join(templatesDir, templateFile);
          const templateContent = await fs.readFile(templatePath, 'utf8');
          const templateName = path.basename(templateFile, '.html');
          this.templates.set(templateName, handlebars.compile(templateContent));
        } catch (fileError) {
          console.warn(`Template ${templateFile} not found, using fallback`);
          this.createFallbackTemplate(path.basename(templateFile, '.html'));
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      this.createAllFallbackTemplates();
    }
  }

  /**
   * Create fallback template
   */
  createFallbackTemplate(templateName) {
    let template;
    
    switch (templateName) {
      case 'welcome':
        template = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Welcome to TaskTrackr!</h1>
            <p>Hi {{name}},</p>
            <p>Welcome to TaskTrackr! We're excited to help you manage your tasks efficiently.</p>
            <p>Get started by creating your first task and organizing your workflow.</p>
            <p>Best regards,<br>The TaskTrackr Team</p>
          </div>
        `;
        break;
      
      case 'task-reminder':
        template = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Task Reminder</h1>
            <p>Hi {{userName}},</p>
            <p>This is a reminder about your upcoming task:</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <h3 style="margin-top: 0;">{{taskTitle}}</h3>
              <p><strong>Due Date:</strong> {{dueDate}}</p>
              <p><strong>Priority:</strong> {{priority}}</p>
              {{#if description}}<p><strong>Description:</strong> {{description}}</p>{{/if}}
            </div>
            <p>Don't forget to complete your task on time!</p>
            <p>Best regards,<br>TaskTrackr</p>
          </div>
        `;
        break;
      
      case 'password-reset':
        template = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Password Reset Request</h1>
            <p>Hi {{name}},</p>
            <p>You requested a password reset for your TaskTrackr account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="{{resetLink}}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>Best regards,<br>TaskTrackr</p>
          </div>
        `;
        break;
      
      case 'daily-summary':
        template = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Daily Task Summary</h1>
            <p>Hi {{userName}},</p>
            <p>Here's your daily task summary:</p>
            <div style="background: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 5px;">
              <p><strong>Total Tasks:</strong> {{totalTasks}}</p>
              <p><strong>Completed:</strong> {{completedTasks}}</p>
              <p><strong>Pending:</strong> {{pendingTasks}}</p>
              <p><strong>Overdue:</strong> {{overdueTasks}}</p>
            </div>
            {{#if upcomingTasks}}
            <h3>Upcoming Tasks:</h3>
            <ul>
              {{#each upcomingTasks}}
              <li>{{title}} - Due: {{dueDate}}</li>
              {{/each}}
            </ul>
            {{/if}}
            <p>Keep up the great work!</p>
            <p>Best regards,<br>TaskTrackr</p>
          </div>
        `;
        break;
      
      case 'task-overdue':
        template = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #d32f2f;">Overdue Task Alert</h1>
            <p>Hi {{userName}},</p>
            <p>You have overdue tasks that need attention:</p>
            {{#each overdueTasks}}
            <div style="background: #ffebee; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #d32f2f;">
              <h4 style="margin-top: 0; color: #d32f2f;">{{title}}</h4>
              <p><strong>Due Date:</strong> {{dueDate}}</p>
              <p><strong>Days Overdue:</strong> {{daysOverdue}}</p>
            </div>
            {{/each}}
            <p>Please review and update these tasks as soon as possible.</p>
            <p>Best regards,<br>TaskTrackr</p>
          </div>
        `;
        break;
      
      default:
        template = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>TaskTrackr Notification</h1>
            <p>{{message}}</p>
          </div>
        `;
    }

    this.templates.set(templateName, handlebars.compile(template));
  }

  /**
   * Create all fallback templates
   */
  createAllFallbackTemplates() {
    const templateNames = ['welcome', 'task-reminder', 'password-reset', 'daily-summary', 'task-overdue'];
    templateNames.forEach(name => this.createFallbackTemplate(name));
  }

  /**
   * Check if email service is configured
   */
  isConfigured() {
    return this.configured && this.transporter !== null;
  }

  /**
   * Send email using template
   */
  async sendEmail(to, subject, templateName, data = {}, attachments = null) {
    if (!this.isConfigured()) {
      console.warn('Email service not configured, skipping email send');
      return { success: false, message: 'Email service not configured' };
    }

    try {
      const template = this.templates.get(templateName);
      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      const html = template(data);
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || `"TaskTrackr" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log(`Email sent successfully to ${to}: ${result.messageId}`);
      
      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send email'
      };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(user) {
    return await this.sendEmail(
      user.email,
      'Welcome to TaskTrackr!',
      'welcome',
      { name: user.name }
    );
  }

  /**
   * Send task reminder email
   */
  async sendTaskReminder(user, task) {
    const data = {
      userName: user.name,
      taskTitle: task.title,
      description: task.description,
      dueDate: new Date(task.dueDate).toLocaleDateString(),
      priority: task.priority.toUpperCase()
    };

    return await this.sendEmail(
      user.email,
      `Task Reminder: ${task.title}`,
      'task-reminder',
      data
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const data = {
      name: user.name,
      resetLink
    };

    return await this.sendEmail(
      user.email,
      'Password Reset Request - TaskTrackr',
      'password-reset',
      data
    );
  }

  /**
   * Send daily summary email
   */
  async sendDailySummary(user, summary) {
    const data = {
      userName: user.name,
      totalTasks: summary.totalTasks,
      completedTasks: summary.completedTasks,
      pendingTasks: summary.pendingTasks,
      overdueTasks: summary.overdueTasks,
      upcomingTasks: summary.upcomingTasks?.map(task => ({
        title: task.title,
        dueDate: new Date(task.dueDate).toLocaleDateString()
      }))
    };

    return await this.sendEmail(
      user.email,
      'Your Daily Task Summary - TaskTrackr',
      'daily-summary',
      data
    );
  }

  /**
   * Send overdue tasks alert
   */
  async sendOverdueAlert(user, overdueTasks) {
    const data = {
      userName: user.name,
      overdueTasks: overdueTasks.map(task => ({
        title: task.title,
        dueDate: new Date(task.dueDate).toLocaleDateString(),
        daysOverdue: Math.ceil((new Date() - new Date(task.dueDate)) / (1000 * 60 * 60 * 24))
      }))
    };

    return await this.sendEmail(
      user.email,
      'Overdue Tasks Alert - TaskTrackr',
      'task-overdue',
      data
    );
  }

  /**
   * Send custom email
   */
  async sendCustomEmail(to, subject, message, attachments = null) {
    const data = { message };
    
    return await this.sendEmail(
      to,
      subject,
      'default',
      data,
      attachments
    );
  }
}

module.exports = new EmailService();