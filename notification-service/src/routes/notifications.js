const express = require('express');
const { authMiddleware } = require('@tasktrackr/common');
const { sendDailyDigest, sendWeeklyummary } = require('../services/reminderService');
const { successResponse, errorResponse } = require('@tasktrackr/common');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * Manually trigger daily digest
 */
router.post('/daily-digest', async (req, res) => {
  try {
    const userId = req.user._id;
    await sendDailyDigest(userId);
    successResponse(res, null, 'Daily digest sent successfully');
  } catch (error) {
    console.error('Send daily digest error:', error);
    errorResponse(res, 'Failed to send daily digest', 500);
  }
});

/**
 * Manually trigger weekly summary
 */
router.post('/weekly-summary', async (req, res) => {
  try {
    const userId = req.user._id;
    await sendWeeklyummary(userId);
    successResponse(res, null, 'Weekly summary sent successfully');
  } catch (error) {
    console.error('Send weekly summary error:', error);
    errorResponse(res, 'Failed to send weekly summary', 500);
  }
});

/**
 * Test notification endpoint
 */
router.post('/test', async (req, res) => {
  try {
    const { sendEmail } = require('../services/emailService');
    
    await sendEmail({
      to: req.user.email,
      subject: 'Test Notification - TaskTrackr',
      html: '<h1>Test Email</h1><p>If you received this, notifications are working correctly!</p>'
    });
    
    successResponse(res, null, 'Test notification sent successfully');
  } catch (error) {
    console.error('Test notification error:', error);
    errorResponse(res, 'Failed to send test notification', 500);
  }
});

module.exports = router;