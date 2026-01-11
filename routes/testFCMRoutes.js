const express = require('express');
const router = express.Router();
const testFCMController = require('../controllers/testFCMController');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/test/health
 * @desc    Health check for FCM service
 * @access  Private
 */
router.get('/health', auth, testFCMController.healthCheck);

/**
 * @route   GET /api/test/fcm-status
 * @desc    Get FCM status for current user
 * @access  Private
 */
router.get('/fcm-status', auth, async (req, res) => {
  try {
    const FCMToken = require('../models/FCMToken');
    const userId = req.user._id;
    
    console.log(`[FCM-Status] Checking status for user: ${userId}`);
    
    const tokens = await FCMToken.find({ userId });
    
    console.log(`[FCM-Status] Found ${tokens.length} token(s)`);
    
    res.json({
      success: true,
      hasTokens: tokens.length > 0,
      tokenCount: tokens.length,
      tokens: tokens.map(t => ({
        id: t._id,
        tokenPreview: t.token.substring(0, 20) + '...',
        lastUpdated: t.lastUpdated,
        createdAt: t.createdAt
      }))
    });
  } catch (error) {
    console.error('[FCM-Status] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   POST /api/test/send-test/:userId
 * @desc    Send test notification to a user
 * @access  Private
 */
router.post('/send-test/:userId', auth, testFCMController.sendTestNotification);

/**
 * @route   GET /api/test/fcm-config
 * @desc    Check FCM configuration
 * @access  Private
 */


// Add this route to testFCMRoutes.js
router.post('/manual-test', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;
    
    console.log(`[Manual-Test] Testing FCM token: ${token ? token.substring(0, 30) + '...' : 'No token'}`);
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Test if token looks valid
    const isValid = token.length > 100 && 
                   (token.includes(':APA91b') || token.includes('fcm') || token.includes('AAAA'));
    
    if (!isValid) {
      console.log(`[Manual-Test] ❌ Token looks invalid: ${token.length} chars`);
      return res.status(400).json({
        success: false,
        message: 'Token format appears invalid. Valid FCM tokens are 152+ characters and contain :APA91b',
        tokenLength: token.length,
        sampleToken: 'Example: fk3Kp8DjT0yf...:APA91bH6dSYO5TXfK9G3z0C3...'
      });
    }
    
    // Register the token
    const existingToken = await FCMToken.findOne({ userId });
    if (existingToken) {
      existingToken.token = token;
      existingToken.lastUpdated = new Date();
      await existingToken.save();
    } else {
      const newToken = new FCMToken({
        userId,
        token
      });
      await newToken.save();
    }
    
    // Send test notification
    const testPayload = {
      notification: {
        title: 'Manual Test',
        body: 'FCM manual test notification'
      },
      data: {
        type: 'manual_test',
        timestamp: new Date().toISOString()
      }
    };
    
    await fcmService.sendToUser(userId, testPayload);
    
    res.json({
      success: true,
      message: 'Test notification sent',
      tokenRegistered: true,
      tokenLength: token.length,
      tokenPreview: token.substring(0, 30) + '...'
    });
    
  } catch (error) {
    console.error('[Manual-Test] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});



router.get('/fcm-config', auth, async (req, res) => {
  try {
    const config = {
      success: true,
      config: {
        firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
        firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        firebaseInitialized: true,
        nodeEnv: process.env.NODE_ENV || 'development'
      }
    };
    
    console.log('[FCM-Config] Returning config:', config);
    
    res.json(config);
  } catch (error) {
    console.error('[FCM-Config] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;