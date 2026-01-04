# FCM (Firebase Cloud Messaging) Backend Integration Notes

This document outlines the backend's Firebase Cloud Messaging (FCM) integration, providing essential information for frontend developers to integrate FCM notifications effectively. It covers backend endpoints, token management, configuration, and notification payload structures.

---

## 1. Overview

The backend is configured to send Firebase Cloud Messages using the `firebase-admin` SDK. This allows for sending push notifications to client applications (Android, iOS, Web) via FCM.

---

## 2. Backend Endpoints

All FCM-related backend endpoints are private and require user authentication. Ensure your frontend sends appropriate authentication headers (e.g., a JWT token).

### 2.1. Register/Update FCM Token

*   **Endpoint:** `POST /api/notifications/register-token`
*   **Description:** Registers a new FCM device token for the authenticated user or updates an existing one. If a token is already registered to another user, it will be reassigned to the current authenticated user.
*   **Access:** Private (requires authentication).
*   **Method:** `POST`
*   **Request Body:**
    ```json
    {
      "token": "YOUR_FCM_DEVICE_TOKEN_STRING"
    }
    ```
    *   `token`: The FCM device registration token obtained from the client-side Firebase SDK.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "FCM token registered successfully.",
      "token": {
        "_id": "65bc6f5b...",
        "userId": "65b2d20e...",
        "token": "YOUR_FCM_DEVICE_TOKEN_STRING",
        "lastUpdated": "2026-01-04T12:30:00.000Z",
        "createdAt": "2026-01-04T12:30:00.000Z",
        "__v": 0
      }
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: `{"success": false, "message": "FCM token is required."}`
    *   `409 Conflict`: `{"success": false, "message": "This FCM token is already registered to another user."}` (if a unique index violation occurs for the token field, though the controller attempts to reassign it).
    *   `500 Internal Server Error`: Generic server error.

### 2.2. Test FCM Configuration for Current User

*   **Endpoint:** `GET /api/notifications/test-fcm`
*   **Description:** Allows an authenticated user to check if they have any FCM tokens registered with the backend.
*   **Access:** Private (requires authentication).
*   **Method:** `GET`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "FCM test completed",
      "hasTokens": true,
      "tokenCount": 1,
      "tokens": [
        {
          "id": "65bc6f5b...",
          "tokenPreview": "YOUR_FCM_DEVICE_TOKEN_P...", // First 20 chars + '...'
          "lastUpdated": "2026-01-04T12:30:00.000Z"
        }
      ]
    }
    ```
*   **Error Response (500 Internal Server Error):** Generic server error.

### 2.3. FCM Service Health Check

*   **Endpoint:** `GET /api/test/health`
*   **Description:** Provides a general health check for the FCM service, including the total count of registered FCM tokens in the database.
*   **Access:** Private (requires authentication).
*   **Method:** `GET`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "FCM Service is running",
      "stats": {
        "totalTokens": 5, // Example: total number of unique FCM tokens stored
        "firebaseInitialized": true,
        "timestamp": "2026-01-04T12:30:00.000Z"
      }
    }
    ```
*   **Error Response (500 Internal Server Error):** Generic server error.

### 2.4. Get FCM Status for Current User

*   **Endpoint:** `GET /api/test/fcm-status`
*   **Description:** Retrieves detailed FCM token status for the authenticated user, similar to `/api/notifications/test-fcm` but with slightly different output and logging.
*   **Access:** Private (requires authentication).
*   **Method:** `GET`
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "hasTokens": true,
      "tokenCount": 1,
      "tokens": [
        {
          "id": "65bc6f5b...",
          "tokenPreview": "YOUR_FCM_DEVICE_TOKEN_P...",
          "lastUpdated": "2026-01-04T12:30:00.000Z",
          "createdAt": "2026-01-04T12:30:00.000Z"
        }
      ]
    }
    ```
*   **Error Response (500 Internal Server Error):** Generic server error.

### 2.5. Send Test Notification to a User

*   **Endpoint:** `POST /api/test/send-test/:userId`
*   **Description:** Sends a generic test notification to a specified `userId`. This is highly useful for debugging and verifying end-to-end FCM delivery to a particular user's device.
*   **Access:** Private (requires authentication).
*   **Method:** `POST`
*   **URL Parameter:**
    *   `userId`: The database ID of the target user to whom the test notification will be sent.
*   **Request Body:** None needed.
*   **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Test notification sent successfully",
      "tokens": ["YOUR_FCM_DEVICE_TOKEN_P..."] // Preview of tokens to which the notification was attempted to be sent
    }
    ```
*   **Error Responses:**
    *   `400 Bad Request`: `{"success": false, "message": "User has no FCM tokens registered"}`
    *   `404 Not Found`: `{"success": false, "message": "Current user not found"}` (if the authenticated user making the request does not exist).
    *   `500 Internal Server Error`: Generic server error.

---

## 3. FCM Token Management

### 3.1. `FCMToken` Mongoose Model

The backend stores FCM device tokens in a MongoDB collection managed by the `FCMToken` model.

*   **Schema Fields:**
    *   `userId`:
        *   **Type:** `mongoose.Schema.Types.ObjectId`
        *   **Ref:** `"User"`
        *   **Required:** `true`
        *   **Unique:** `true` (A user can theoretically have multiple devices, but this schema currently enforces one token per user. Frontend should send the *active* device token.)
    *   `token`:
        *   **Type:** `String`
        *   **Required:** `true`
        *   **Unique:** `true` (Ensures no two `FCMToken` documents have the same token, preventing conflicts).
    *   `lastUpdated`:
        *   **Type:** `Date`
        *   **Default:** `Date.now`
        *   (Automatically updated `pre('save')` hook.)
    *   `createdAt`:
        *   **Type:** `Date`
        *   **Default:** `Date.now`

### 3.2. Automatic Token Removal

The `fcmService` automatically handles the removal of invalid or expired FCM tokens from the database. If FCM returns errors like `messaging/invalid-registration-token` or `messaging/registration-token-not-registered` when attempting to send a notification, the corresponding token(s) are deleted from the `FCMToken` collection.

---

## 4. FCM Configuration (Environment Variables)

The backend initializes the Firebase Admin SDK using credentials provided via environment variables. These variables are crucial for the backend to authenticate with Firebase and send FCM messages. They typically correspond to the fields in a Firebase service account private key JSON file.

*   `FIREBASE_TYPE`
*   `FIREBASE_PROJECT_ID`
*   `FIREBASE_PRIVATE_KEY_ID`
*   `FIREBASE_PRIVATE_KEY`: **CRITICAL:** If you are setting this in an `.env` file, ensure that any newline characters (`\n`) within the private key are escaped as `\\n`. The backend code automatically converts `\\n` back to `\n` for the Firebase SDK.
*   `FIREBASE_CLIENT_EMAIL`
*   `FIREBASE_CLIENT_ID`
*   `FIREBASE_AUTH_URI`
*   `FIREBASE_TOKEN_URI`
*   `FIREBASE_AUTH_PROVIDER_X509_CERT_URL`
*   `FIREBASE_CLIENT_X509_CERT_URL`

---

## 5. Notification Payloads for Frontend Integration

When the frontend receives an FCM message, it will contain `notification` (for display) and `data` (for custom logic). The `data` object is crucial for handling different notification types and navigating within the application.

### 5.1. New Message Notification (`type: 'chat_message'`) 

*   **Purpose:** Notifies the recipient of a new chat message.
*   **Example `data` payload:**
    ```json
    {
      "type": "chat_message",
      "otherUserId": "65b2d20e...",         // The _id of the user who sent the message
      "otherUserName": "Sender Name",       // The display name of the sender
      "otherUserPhotoURL": "https://example.com/avatar.jpg", // Sender's avatar URL (can be empty)
      "conversationId": "65c3e4f5...",     // The _id of the conversation
      "messageId": "65d4f5e6...",           // The _id of the new message
      "text": "Hey, how are you?",          // The content of the message (empty if attachment)
      "timestamp": "2026-01-04T12:30:00.000Z" // When the message was sent
    }
    ```
*   **Example `notification` payload:**
    ```json
    {
      "title": "Sender Name",                 // Or "Someone"
      "body": "Hey, how are you?",            // Or "Sent an attachment"
      "sound": "default",                     // Plays default notification sound
      "priority": "high",
      "android_channel_id": "chat_messages"   // Specific channel for Android (required for custom settings)
    }
    ```

### 5.2. Friend Request Notification (`type: 'FRIEND_REQUEST'`) 

*   **Purpose:** Notifies a user that they have received a new friend request.
*   **Example `data` payload:**
    ```json
    {
      "type": "FRIEND_REQUEST",
      "senderId": "65b2d20e...",         // The _id of the user who sent the request
      "senderName": "Request Sender Name" // The display name of the sender
    }
    ```
*   **Example `notification` payload:**
    ```json
    {
      "title": "New Friend Request",
      "body": "Request Sender Name wants to be your friend",
      "sound": "default"
    }
    ```

### 5.3. Friend Request Accepted Notification (`type: 'FRIEND_REQUEST_ACCEPTED'`) 

*   **Purpose:** Notifies the original sender of a friend request that their request has been accepted.
*   **Example `data` payload:**
    ```json
    {
      "type": "FRIEND_REQUEST_ACCEPTED",
      "acceptorId": "65c3e4f5...",         // The _id of the user who accepted the request
      "acceptorName": "Acceptor Name"      // The display name of the acceptor
    }
    ```
*   **Example `notification` payload:**
    ```json
    {
      "title": "Friend Request Accepted",
      "body": "Acceptor Name accepted your friend request",
      "sound": "default"
    }
    ```

---

## 6. Important Notes for Frontend FCM Integration

*   **Firebase Project Consistency:** The frontend Firebase configuration (when initializing the client-side SDK) MUST point to the *same* Firebase project as the backend's Admin SDK. This ensures that the device tokens are valid for the project that sends notifications.
*   **Obtain and Register Device Token:**
    *   The frontend application must obtain the FCM device token using the client-side Firebase Messaging SDK (e.g., `firebase.messaging().getToken()`).
    *   This token should then be sent to the backend using the `POST /api/notifications/register-token` endpoint as soon as it's available, typically after a user logs in or when the app initializes.
*   **Handle Foreground Messages (Android/iOS):**
    *   On Android and iOS, if your app is in the foreground, FCM messages containing a `notification` payload often **do not automatically trigger a visible notification display**.
    *   The frontend must implement a listener (e.g., `firebase.messaging().onMessage`) to intercept these messages and manually display a local notification or update the UI (e.g., a banner, a chat bubble) to alert the user.
*   **Android Notification Channels:**
    *   For Android (Oreo 8.0 / API level 26 and higher), notification channels are mandatory.
    *   The backend sends an `android_channel_id: "chat_messages"` for new message notifications. Your Android frontend application should define a corresponding notification channel with the ID `"chat_messages"` to allow users to customize settings (sound, vibration, importance) specifically for chat notifications.
*   **Background/Killed State Messages:**
    *   When the app is in the background or killed, FCM handles the display of notifications automatically based on the `notification` payload.
    *   When the user taps on such a notification, the app will typically launch, and the `data` payload will be available for processing (e.g., via `firebase.messaging().getInitialNotification()` or through intent/deep link handling).
*   **Payload Structure:** Always access both the `notification` object (for display properties) and the `data` object (for custom application logic) when an FCM message is received. The `data` object is critical for distinguishing between message types and extracting relevant IDs and content.
*   **Deep Linking:** Consider using the data payload to implement deep linking, allowing notifications to directly open relevant screens (e.g., a specific chat conversation) within your application.

This comprehensive guide should help in integrating FCM notifications successfully on the frontend.
