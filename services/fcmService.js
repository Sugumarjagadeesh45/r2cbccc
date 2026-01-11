// D:\reals2chat_backend-main\services\fcmService.js
const admin = require("../config/firebase");
const FCMToken = require("../models/FCMToken");

// Add validation function
const isValidFCMToken = (token) => {
  if (!token) {
    console.log('[FCM-Validation] ❌ Token is null/undefined');
    return false;
  }
  
  if (typeof token !== 'string') {
    console.log('[FCM-Validation] ❌ Token is not a string:', typeof token);
    return false;
  }
  
  // Valid FCM tokens are usually 152+ characters
  if (token.length < 100) {
    console.log(`[FCM-Validation] ❌ Token too short: ${token.length} chars`);
    return false;
  }
  
  // Check for FCM token patterns
  const hasValidPattern = token.includes(':APA91b') || 
                         token.startsWith('fcm') ||
                         token.includes('AAAA');
  
  if (!hasValidPattern) {
    console.log(`[FCM-Validation] ⚠️ Token doesn't match FCM pattern: ${token.substring(0, 30)}...`);
    // We'll still try to send it, but log warning
  }
  
  console.log(`[FCM-Validation] ✅ Token appears valid (${token.length} chars)`);
  return true;
};

// Modify sendNotification function
const sendNotification = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) {
    console.log('[FCM-Service] ❌ No tokens to send notification to');
    return;
  }

  console.log('\n[FCM-Service] ==========================================');
  console.log('[FCM-Service] 🚀 SENDING NOTIFICATION');
  console.log('[FCM-Service] Number of tokens:', tokens.length);
  
  // Validate each token
  const validTokens = [];
  const invalidTokens = [];
  
  tokens.forEach(token => {
    if (isValidFCMToken(token)) {
      validTokens.push(token);
    } else {
      invalidTokens.push(token);
    }
  });
  
  if (validTokens.length === 0) {
    console.log('[FCM-Service] ❌ No valid tokens to send notification to');
    if (invalidTokens.length > 0) {
      console.log('[FCM-Service] Invalid tokens found:', invalidTokens.length);
    }
    return;
  }
  
  console.log(`[FCM-Service] ✅ Valid tokens: ${validTokens.length}, Invalid: ${invalidTokens.length}`);
  console.log('[FCM-Service] First valid token:', validTokens[0].substring(0, 50) + '...');
  console.log('[FCM-Service] ==========================================\n');

  try {
    const messagePayload = {
      tokens: validTokens,
      notification: payload.notification,
      data: payload.data,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "chat_messages",
          priority: "max",
          visibility: "public",
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);

    console.log('[FCM-Service] ✅ FCM Response Success Count:', response.successCount);
    
    if (response.successCount === 0 && response.failureCount > 0) {
      console.log('[FCM-Service] ❌ FCM Response Failure Count:', response.failureCount);
    }

    const tokensToRemove = [];
    response.responses.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('[FCM-Service] ❌ Failure sending notification:', {
          token: validTokens[index].substring(0, 20) + '...',
          error: error.message,
          code: error.code
        });
        
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered" ||
          error.code === "messaging/invalid-argument"
        ) {
          tokensToRemove.push(validTokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      console.log('[FCM-Service] 🗑️ Removing invalid tokens:', tokensToRemove.length);
      await FCMToken.deleteMany({ token: { $in: tokensToRemove } });
    }
  } catch (error) {
    console.error('[FCM-Service] ❌ Error in sendNotification:', error.message);
    console.error('[FCM-Service] Error details:', error);
  }
};

const sendToUser = async (userId, payload) => {
  try {
    console.log(`[FCM-Service] 🔍 Fetching tokens for user: ${userId}`);
    const userTokens = await FCMToken.find({ userId }).select("token -_id");
    
    if (userTokens.length === 0) {
      console.log(`[FCM-Service] ❌ No FCM tokens found for user ${userId}`);
      return { success: false, error: 'No tokens found for user' };
    }
    
    const tokens = userTokens.map((t) => t.token);
    console.log(`[FCM-Service] ✅ Found ${tokens.length} tokens. Sending notification...`);
    return await sendNotification(tokens, payload);
    
  } catch (error) {
    console.error(`[FCM-Service] ❌ Failed to fetch tokens for user ${userId}:`, error.message);
    return { success: false, error: error.message };
  }
};

const sendNewMessageNotification = async (recipientId, sender, message, conversationId) => {
  console.log(`[FCM-Service] 💬 Preparing notification for ${recipientId}`);
  
  const payload = {
    notification: {
      title: sender.name || 'New Message',
      body: message.text || (message.attachment ? 'Sent an attachment' : 'Sent a message'),
    },
    data: {
      type: 'chat_message',
      otherUserId: sender._id.toString(),
      otherUserName: sender.name || 'Unknown User',
      otherUserPhotoURL: sender.photoURL || '',
      conversationId: conversationId.toString(),
      messageId: message._id.toString(),
      text: message.text || '',
      timestamp: new Date().toISOString()
    },
  };
  
  return await sendToUser(recipientId, payload);
};

const sendFriendRequestNotification = async (recipientId, sender) => {
  const payload = {
    notification: {
      title: 'New Friend Request',
      body: `${sender.name || 'Someone'} wants to be your friend`,
    },
    data: {
      type: 'FRIEND_REQUEST',
      senderId: sender._id.toString(),
      senderName: sender.name || 'Unknown User'
    },
  };
  return await sendToUser(recipientId, payload);
};

const sendFriendRequestAcceptedNotification = async (originalSenderId, acceptor) => {
  const payload = {
    notification: {
      title: 'Friend Request Accepted',
      body: `${acceptor.name || 'Someone'} accepted your friend request`,
    },
    data: {
      type: 'FRIEND_REQUEST_ACCEPTED',
      acceptorId: acceptor._id.toString(),
      acceptorName: acceptor.name || 'Unknown User'
    }
  };
  return await sendToUser(originalSenderId, payload);
};

module.exports = {
  sendNotification,
  sendToUser,
  sendToUsers: sendToUser, 
  sendNewMessageNotification,
  sendFriendRequestNotification,
  sendFriendRequestAcceptedNotification,
};