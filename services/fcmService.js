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
  console.log('[FCM-Service] First token:', tokens[0].substring(0, 20) + '...');
  console.log('[FCM-Service] Payload:', JSON.stringify(payload, null, 2));
  console.log('[FCM-Service] ==========================================\n');

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: tokens,
      notification: payload.notification,
      data: payload.data,
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "chat_messages",
          priority: "high"
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true
          }
        }
      }
    });

    console.log('[FCM-Service] ✅ FCM Response:', JSON.stringify(response, null, 2));

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
      } else {
        console.log(`[FCM-Service] ✅ Successfully sent to token ${tokens[index].substring(0, 20)}...`);
      }
    });

    if (tokensToRemove.length > 0) {
      console.log('[FCM-Service] 🗑️ Removing invalid tokens:', tokensToRemove.map(t => t.substring(0, 20) + '...'));
      await FCMToken.deleteMany({ token: { $in: tokensToRemove } });
    }
  } catch (error) {
    console.error('[FCM-Service] ❌ Error in sendNotification:', error.message, error.stack);
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
    
    console.log(`[FCM-Service] ✅ Found ${userTokens.length} token(s) for user ${userId}`);
    
    const tokens = userTokens.map((t) => t.token);
    await sendNotification(tokens, payload);
    
  } catch (error) {
    console.error(`[FCM-Service] ❌ Failed to fetch tokens for user ${userId}:`, error.message);
  }
};

const sendNewMessageNotification = async (recipientId, sender, message, conversationId) => {
  console.log(`\n[FCM-Service] 💬 Sending new message notification`);
  console.log(`[FCM-Service] Recipient ID: ${recipientId}`);
  console.log(`[FCM-Service] Sender: ${sender.name} (${sender._id})`);
  console.log(`[FCM-Service] Message: ${message.text || '[Attachment]'}`);
  console.log(`[FCM-Service] Conversation ID: ${conversationId}`);
  
  const payload = {
    notification: {
      title: `${sender.name || 'Someone'}`,
      body: message.text || (message.attachment ? `Sent an attachment` : 'Sent a message'),
      sound: "default",
      priority: "high",
      android_channel_id: "chat_messages"
    },
    data: {
      type: 'chat_message',
      otherUserId: sender._id.toString(),
      otherUserName: sender.name || 'Unknown User',
      otherUserPhotoURL: sender.photoURL || '',
      conversationId: conversationId.toString(),
      messageId: message._id.toString(),
      text: message.text || '',
      timestamp: message.createdAt ? message.createdAt.toISOString() : new Date().toISOString()
    },
  };
  
  await sendToUser(recipientId, payload);
};

const sendFriendRequestNotification = async (recipientId, sender) => {
  console.log(`\n[FCM-Service] 👥 Sending friend request notification`);
  console.log(`[FCM-Service] To: ${recipientId}`);
  console.log(`[FCM-Service] From: ${sender.name} (${sender._id})`);
  
  const payload = {
    notification: {
      title: 'New Friend Request',
      body: `${sender.name || 'Someone'} wants to be your friend`,
      sound: "default"
    },
    data: {
      type: 'FRIEND_REQUEST',
      senderId: sender._id.toString(),
      senderName: sender.name || 'Unknown User'
    },
  };
  await sendToUser(recipientId, payload);
};

const sendFriendRequestAcceptedNotification = async (originalSenderId, acceptor) => {
  console.log(`\n[FCM-Service] ✅ Sending friend request accepted notification`);
  console.log(`[FCM-Service] To: ${originalSenderId}`);
  console.log(`[FCM-Service] Acceptor: ${acceptor.name} (${acceptor._id})`);
  
  const payload = {
    notification: {
      title: 'Friend Request Accepted',
      body: `${acceptor.name || 'Someone'} accepted your friend request`,
      sound: "default"
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
  sendToUsers: sendToUser, // For compatibility
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
