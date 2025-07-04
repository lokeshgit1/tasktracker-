const nodemailer = require('nodemailer');

// Email templates
const emailTemplates = {
  welcome: (data) => ({
    subject: 'Welcome to TaskTrackr!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to TaskTrackr!</h1>
        <p>Hi ${data.name},</p>
        <p>Thank you for joining TaskTrackr! We're excited to help you stay organized and productive.</p>
        <p>Here's what you can do with TaskTrackr:</p>
        <ul>
          <li>Create and manage tasks with priorities and due dates</li>
          <li>Add file attachments to your tasks</li>
          <li>Work offline and sync when you're back online</li>
          <li>Set reminders to never miss a deadline</li>
        </ul>
        <p>Get started by creating your first task!</p>
        <p>Happy organizing!</p>
        <p>The TaskTrackr Team</p>
      </div>
    `,
    text: `
      Welcome to TaskTrackr!
      
      Hi ${data.name},
      
      Thank you for joining TaskTrackr! We're excited to help you stay organized and productive.
      
      Here's what you can do with TaskTrackr:
      - Create and manage tasks with priorities and due dates
      - Add file attachments to your tasks
      - Work offline and sync when you're back online
      - Set reminders to never miss a deadline
      
      Get started by creating your first task!
      
      Happy organizing!
      The TaskTrackr Team
    `
  }),

  passwordReset: (data) => ({
    subject: 'Password Reset Request - TaskTrackr',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Password Reset Request</h1>
        <p>Hi ${data.name},</p>
        <p>We received a request to reset your password for your TaskTrackr account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${data.resetUrl}">${data.resetUrl}</a></p>
        <p>This link will expire in 1 hour for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>The TaskTrackr Team</p>
      </div>
    `,
    text: `
      Password Reset Request - TaskTrackr
      
      Hi ${data.name},
      
      We received a request to reset your password for your TaskTrackr account.
      
      Please visit the following link to reset your password:
      ${data.resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you didn't request this password reset, please ignore this email.
      
      Best regards,
      The TaskTrackr Team
    `
  }),

  emailVerification: (data) => ({
    subject: 'Verify your email - TaskTrackr',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Verify Your Email</h1>
        <p>Hi ${data.name},</p>
        <p>Please verify your email address to complete your TaskTrackr account setup.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationUrl}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p><a href="${data.verificationUrl}">${data.verificationUrl}</a></p>
        <p>If you didn't create this account, please ignore this email.</p>
        <p>Best regards,<br>The TaskTrackr Team</p>
      </div>
    `,
    text: `
      Verify Your Email - TaskTrackr
      
      Hi ${data.name},
      
      Please verify your email address to complete your TaskTrackr account setup.
      
      Click the following link to verify your email:
      ${data.verificationUrl}
      
      If you didn't create this account, please ignore this email.
      
      Best regards,
      The TaskTrackr Team
    `
  })
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Send email using the specified template
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject (optional if using template)
 * @param {string} options.template - Template name
 * @param {Object} options.data - Data for template
 * @param {string} options.html - Custom HTML content
 * @param {string} options.text - Custom text content
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
      text: emailContent.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;

  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

/**
 * Send bulk emails
 * @param {Array} emails - Array of email options
 */
const sendBulkEmails = async (emails) => {
  try {
    const transporter = createTransporter();
    const results = [];

    for (const emailOptions of emails) {
      try {
        const result = await sendEmail(emailOptions);
        results.push({ success: true, messageId: result.messageId, to: emailOptions.to });
      } catch (error) {
        results.push({ success: false, error: error.message, to: emailOptions.to });
      }
    }

    return results;
  } catch (error) {
    console.error('Bulk email sending failed:', error);
    throw error;
  }
};

/**
 * Verify email configuration
 */
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration is invalid:', error);
    return false;
  }
};

module.exports = {
  sendEmail,
  sendBulkEmails,
  verifyEmailConfig,
  emailTemplates
};