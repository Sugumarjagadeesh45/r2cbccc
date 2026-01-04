const fcmService = require('../services/fcmService');
const FCMToken = require('../models/FCMToken');
const User = require('../models/userModel');

exports.sendTestNotification = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    console.log(`[Test-Notification] Sending test notification to user: ${userId}`);
    console.log(`[Test-Notification] From user: ${currentUserId}`);
    
    // Check if user has FCM token
    const tokens = await FCMToken.find({ userId });
    
    if (tokens.length === 0) {
      console.log(`[Test-Notification] ❌ User ${userId} has no FCM tokens registered`);
      return res.status(400).json({
        success: false,
        message: 'User has no FCM tokens registered'
      });
    }
    
    console.log(`[Test-Notification] ✅ Found ${tokens.length} token(s) for user ${userId}`);
    
    // Get current user info
    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'Current user not found'
      });
    }
    
    // Send test notification
    const testPayload = {
      notification: {
        title: 'Test Notification',
        body: `This is a test notification from ${currentUser.name || 'the system'}`,
        sound: 'default',
        priority: 'high'
      },
      data: {
        type: 'test',
        senderId: currentUserId.toString(),
        senderName: currentUser.name || 'Test User',
        message: 'FCM is working correctly!',
        timestamp: new Date().toISOString()
      }
    };
    
    console.log(`[Test-Notification] 📤 Sending test payload:`, JSON.stringify(testPayload, null, 2));
    
    await fcmService.sendToUser(userId, testPayload);
    
    res.json({
      success: true,
      message: 'Test notification sent successfully',
      tokens: tokens.map(t => t.token.substring(0, 20) + '...')
    });
    
  } catch (error) {
    console.error('[Test-Notification] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Simple health check
exports.healthCheck = async (req, res) => {
  try {
    const FCMToken = require('../models/FCMToken');
    const tokenCount = await FCMToken.countDocuments();
    
    res.json({
      success: true,
      message: 'FCM Service is running',
      stats: {
        totalTokens: tokenCount,
        firebaseInitialized: true,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[FCM-Health] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};