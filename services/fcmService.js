const admin = require("../config/firebase");
const FCMToken = require("../models/FCMToken");

/**
 * Core function to send FCM messages to a list of tokens.
 */
const sendNotification = async (tokens, payload) => {
  if (!tokens || tokens.length === 0) {
    console.log('[FCM-Service] ❌ No tokens to send notification to');
    return;
  }

  console.log('\n[FCM-Service] ==========================================');
  console.log('[FCM-Service] 🚀 SENDING NOTIFICATION');
  console.log('[FCM-Service] Number of tokens:', tokens.length);
  // Log the full token for debugging
  console.log('[FCM-Service] Target Token:', tokens[0]);
  console.log('[FCM-Service] ==========================================\n');

  try {


      const messagePayload = {
    tokens: tokens,
    notification: payload.notification,
    data: payload.data,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "chat_messages",
        priority: "high",
        visibility: "public",
        // Add these for better notification behavior
        vibrate: true,
        vibrationPattern: [0, 250, 250, 250],
        defaultVibrateTimings: true,
        defaultSound: true,
        // Ensure light settings
        lightSettings: {
          color: '#FF0000FF',
          lightOnDurationMs: 0,
          lightOffDurationMs: 0
        }
      }
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
          contentAvailable: true,
          // Add these for iOS
          "mutable-content": 1,
          interruptionLevel: "timeSensitive",
          relevanceScore: 1.0
        }
      }
    }
  };


  
    // const messagePayload = {
    //   tokens: tokens,
    //   notification: payload.notification, // Only 'title' and 'body' allowed here
    //   data: payload.data,
    //   android: {
    //     priority: "high",
    //     notification: {
    //       sound: "default",
    //       channelId: "chat_messages", // Android Channel ID goes here
    //       priority: "high",
    //       visibility: "public"
    //     }
    //   },
    //   apns: {
    //     payload: {
    //       aps: {
    //         sound: "default",
    //         badge: 1,
    //         contentAvailable: true
    //       }
    //     }
    //   }
    // };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);

    console.log('[FCM-Service] ✅ FCM Response Success Count:', response.successCount);

    const tokensToRemove = [];
    response.responses.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('[FCM-Service] ❌ Failure sending notification:', {
          token: tokens[index].substring(0, 20) + '...',
          error: error.message,
          code: error.code
        });
        
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      console.log('[FCM-Service] 🗑️ Removing invalid tokens:', tokensToRemove.length);
      await FCMToken.deleteMany({ token: { $in: tokensToRemove } });
    }
  } catch (error) {
    console.error('[FCM-Service] ❌ Error in sendNotification:', error.message);
  }
};

const sendToUser = async (userId, payload) => {
  try {
    console.log(`[FCM-Service] 🔍 Fetching tokens for user: ${userId}`);
    const userTokens = await FCMToken.find({ userId }).select("token -_id");
    
    if (userTokens.length === 0) {
      console.log(`[FCM-Service] ❌ No FCM tokens found for user ${userId}`);
      return;
    }
    
    const tokens = userTokens.map((t) => t.token);
    console.log(`[FCM-Service] ✅ Found ${tokens.length} tokens. Sending notification...`);
    await sendNotification(tokens, payload);
    
  } catch (error) {
    console.error(`[FCM-Service] ❌ Failed to fetch tokens for user ${userId}:`, error.message);
  }
};

// ✅ FIXED: Removed invalid fields (sound, priority, channel_id) from 'notification'
const sendNewMessageNotification = async (recipientId, sender, message, conversationId) => {
  console.log(`[FCM-Service] 💬 Preparing notification for ${recipientId}`);
  
  const payload = {
    notification: {
      title: sender.name || 'New Message',
      body: message.text || (message.attachment ? 'Sent an attachment' : 'Sent a message'),
      // DO NOT put sound, priority, or channel_id here. 
      // They are handled in sendNotification's android block.
    },
    data: {
      type: 'chat_message',
      channelId: 'chat_messages',
      sound: 'default',
      priority: 'high',
      otherUserId: sender._id.toString(),
      otherUserName: sender.name || 'Unknown User',
      otherUserPhotoURL: sender.photoURL || '',
      conversationId: conversationId.toString(),
      messageId: message._id.toString(),
      text: message.text || '',
      timestamp: new Date().toISOString()
    },
  };
  
  await sendToUser(recipientId, payload);
};

// ✅ FIXED: Removed invalid fields
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
  await sendToUser(recipientId, payload);
};

// ✅ FIXED: Removed invalid fields
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
  await sendToUser(originalSenderId, payload);
};

module.exports = {
  sendNotification,
  sendToUser,
  sendToUsers: sendToUser, 
  sendNewMessageNotification,
  sendFriendRequestNotification,
  sendFriendRequestAcceptedNotification,
};







// const admin = require("../config/firebase");
// const FCMToken = require("../models/FCMToken");

// /**
//  * Core function to send FCM messages to a list of tokens.
//  * It also handles the removal of invalid tokens from the database.
//  *
//  * @param {string[]} tokens An array of FCM registration tokens.
//  * @param {object} payload The notification payload to send.
//  *   - notification: { title: string, body: string }
//  *   - data: { [key: string]: string }
//  */
// const sendNotification = async (tokens, payload) => {
//   if (!tokens || tokens.length === 0) {
//     return;
//   }

//   try {
//     const response = await admin.messaging().sendToDevice(tokens, payload);

//     const tokensToRemove = [];
//     response.results.forEach((result, index) => {
//       const error = result.error;
//       if (error) {
//         console.error(
//           "Failure sending notification to",
//           tokens[index],
//           error
//         );
//         // Cleanup the tokens who are not registered anymore.
//         if (
//           error.code === "messaging/invalid-registration-token" ||
//           error.code === "messaging/registration-token-not-registered"
//         ) {
//           tokensToRemove.push(tokens[index]);
//         }
//       }
//     });

//     if (tokensToRemove.length > 0) {
//       console.log("Removing invalid tokens:", tokensToRemove);
//       await FCMToken.deleteMany({ token: { $in: tokensToRemove } });
//     }
//   } catch (error) {
//     console.error("Error in sendNotification:", error);
//   }
// };

// /**
//  * Sends a notification to a single user by their user ID.
//  * Fetches all tokens for the user and uses the core sendNotification function.
//  *
//  * @param {string} userId The ID of the user.
//  * @param {object} payload The FCM payload.
//  */
// const sendToUser = async (userId, payload) => {
//   try {
//     const userTokens = await FCMToken.find({ userId }).select("token -_id");
//     if (userTokens.length > 0) {
//       const tokens = userTokens.map((t) => t.token);
//       await sendNotification(tokens, payload);
//     }
//   } catch (error) {
//     console.error(`Failed to fetch tokens for user ${userId}:`, error);
//   }
// };

// /**
//  * Sends the same notification to multiple users.
//  * Optimized to fetch all tokens in a single query.
//  *
//  * @param {string[]} userIds Array of user IDs.
//  * @param {object} payload The FCM payload.
//  */
// const sendToUsers = async (userIds, payload) => {
//   try {
//     const userTokens = await FCMToken.find({ userId: { $in: userIds } }).select("token -_id");
//     if (userTokens.length > 0) {
//       const tokens = userTokens.map((t) => t.token);
//       await sendNotification(tokens, payload);
//     }
//   } catch (error) {
//     console.error(`Failed to fetch tokens for multiple users:`, error);
//   }
// };


// // --- Specific Notification Composer Functions ---

// /**
//  * Composes and sends a notification for a new message.
//  * @param {string} recipientId The user ID of the message recipient.
//  * @param {object} sender The user object of the sender (must have name and _id).
//  * @param {object} message The message object (must have text and _id).
//  */
// const sendNewMessageNotification = async (recipientId, sender, message, conversationId) => {
//   const payload = {
//     notification: {
//       title: `New Message from ${sender.name || 'a user'}`,
//       body: message.text || (message.attachment ? `[${message.attachment.type}]` : 'New message'),
//       sound: "default", // Plays default notification sound
//       priority: "high",
//       android_channel_id: "chat_messages" // Required for Android Oreo+ for custom sounds/settings
//     },
//     data: {
//       type: 'chat_message',
//       otherUserId: sender._id.toString(),        // The _id of the user who sent the message (the chat partner for the recipient)
//       otherUserName: sender.name || 'a user',    // The name of the sender
//       otherUserPhotoURL: sender.photoURL || '',  // The avatar URL of the sender
//       conversationId: conversationId.toString(), // Important for navigating to the correct chat
//       messageId: message._id.toString(),
//       text: message.text || '', // Full message text (optional, for direct display in app)
//       timestamp: message.createdAt.toISOString()
//     },
//   };
//   await sendToUser(recipientId, payload);
//   console.log(`[FCM] Notification sent to ${recipientId} for message ${message._id}. Title: ${payload.notification.title}, Body: ${payload.notification.body}`);
// };

// /**
//  * Composes and sends a notification for a new friend request.
//  * @param {string} recipientId The user ID of the request recipient.
//  * @param {object} sender The user object of the sender (must have name and _id).
//  */
// const sendFriendRequestNotification = async (recipientId, sender) => {
//   const payload = {
//     notification: {
//       title: 'New Friend Request',
//       body: `${sender.name || 'Someone'} sent you a friend request.`,
//     },
//     data: {
//       type: 'FRIEND_REQUEST',
//       senderId: sender._id.toString(),
//     },
//   };
//   await sendToUser(recipientId, payload);
// };

// /**
//  * Composes and sends a notification for an accepted friend request.
//  * @param {string} originalSenderId The user ID of the person who sent the request.
//  * @param {object} acceptor The user object of the person who accepted (must have name and _id).
//  */
// const sendFriendRequestAcceptedNotification = async (originalSenderId, acceptor) => {
//     const payload = {
//         notification: {
//             title: 'Friend Request Accepted',
//             body: `${acceptor.name || 'Someone'} accepted your friend request.`,
//         },
//         data: {
//             type: 'FRIEND_REQUEST_ACCEPTED',
//             acceptorId: acceptor._id.toString(),
//         }
//     };
//     await sendToUser(originalSenderId, payload);
// };

// module.exports = {
//   sendNotification,
//   sendToUser,
//   sendToUsers,
//   sendNewMessageNotification,
//   sendFriendRequestNotification,
//   sendFriendRequestAcceptedNotification,
// };
