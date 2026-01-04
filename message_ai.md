# Reals2Chat Backend Requirements & Information for Frontend AI

This document details the backend API endpoints, WebSocket events, and data structures relevant to the chat and messaging features of the Reals2Chat application. It is designed to guide frontend integration, especially for AI-driven components or for extending existing functionality.

---

## 1. Authentication

All endpoints described herein require a valid JSON Web Token (JWT) in the `Authorization` header.

`Authorization: Bearer <your_jwt_token>`

---

## 2. Data Schemas

### 2.1. Message Schema

Represents a single chat message.

| Field | Type | Description |
| :--- | :--- | :--- |
| `_id` | ObjectId | Unique identifier for the message. |
| `conversationId` | ObjectId | The ID of the conversation this message belongs to. |
| `sender` | ObjectId (`User`) | The ID of the user who sent the message. |
| `recipient` | ObjectId (`User`) | The ID of the user who received the message. |
| `text` | String | The content of the message. Can be empty if `attachment` exists. |
| `attachment` | Object | Optional attachment data. |
| `attachment.type` | String | Type of attachment (`'image'`, `'video'`, `'file'`). |
| `attachment.url` | String | URL of the uploaded attachment. |
| `status` | String | The current status of the message (`'sent'`, `'delivered'`, `'read'`). Default is `'sent'`. |
| `deliveredAt` | Date | Timestamp when the message was delivered to the recipient's device (first received). `null` if not yet delivered. |
| `readAt` | Date | Timestamp when the message was read by the recipient. `null` if not yet read. |
| `createdAt` | Date | The timestamp when the message was initially created on the server. |
| `updatedAt` | Date | The timestamp when the message was last updated. |

### 2.2. UserData Schema (Relevant Fields for Chat)

Contains supplementary user information, including online status.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userId` | ObjectId (`User`) | Reference to the core `User` document. |
| `isOnline` | Boolean | `true` if the user is currently online via WebSocket. |
| `lastActive` | Date | Timestamp of the user's last activity or disconnect. |
| `location` | Object | GeoJSON Point for user's last known location. |

---

## 3. API Endpoints for Messaging (HTTP)

### 3.1. Fetch Message History

- **Endpoint:** `GET /api/messages/:otherUserId`
- **Description:** Retrieves the chat history between the authenticated user and `otherUserId`. Messages are returned in ascending order by `createdAt`.
- **Frontend Usage:** `MessageScreen.tsx` calls this on component mount to load previous messages.
- **Expected Success Response (200):**
  ```json
  {
    "success": true,
    "data": [
      // Array of message objects, oldest first
      {
        "_id": "63b8c3b9e4b0e4b8c8e1b1a3",
        "conversationId": "63b8c3b9e4b0e4b8c8e1b1a2",
        "sender": {
          "_id": "60d...d3",
          "userId": "JOHNDOE001",
          "name": "John Doe",
          "photoURL": "https://example.com/avatar_john.jpg"
        },
        "recipient": {
          "_id": "60d...d4",
          "userId": "JANEDOE002",
          "name": "Jane Doe",
          "photoURL": "https://example.com/avatar_jane.jpg"
        },
        "text": "Hello!",
        "attachment": null,
        "status": "read", // 'sent', 'delivered', 'read'
        "deliveredAt": "2023-01-07T12:00:05.000Z", // Can be null
        "readAt": "2023-01-07T12:00:10.000Z",       // Can be null
        "createdAt": "2023-01-07T12:00:00.000Z",
        "updatedAt": "2023-01-07T12:00:10.000Z"
      },
      // ... more messages
    ]
  }
  ```
- **Error Handling:** Standard HTTP error codes (400, 401, 404, 500).

### 3.2. Send a Message (via `/api/messages/send`)

- **Endpoint:** `POST /api/messages/send`
- **Description:** Sends a new message to another user using the recipient's MongoDB `_id`. Triggers an FCM notification if the recipient is offline.
- **Authentication:** Required.
- **Request Body:**
  ```json
  {
    "recipientId": "60d...d7",  // MongoDB ObjectId of the recipient
    "text": "Hello there!",     // Can be empty if attachment exists
    "attachment": {             // Optional: if sending an attachment
        "type": "image" | "video" | "file",
        "url": "https://example.com/uploaded_attachment.jpg" // URL must be pre-uploaded
    }
  }
  ```
- **Success Response (201):** Returns the newly created message object.
  ```json
  {
    "success": true,
    "message": "Message sent successfully.",
    "data": {
      "_id": "63b8c3b9e4b0e4b8c8e1b1a3",
      "conversationId": "63b8c3b9e4b0e4b8c8e1b1a2",
      "sender": { "_id": "...", "name": "...", "avatar": "..." }, // Populated sender
      "recipient": "60d...d7",
      "text": "Hello there!",
      "attachment": null,
      "status": "sent",
      "deliveredAt": null,
      "readAt": null,
      "createdAt": "2023-01-07T12:00:00.000Z",
      "updatedAt": "2023-01-07T12:00:00.000Z"
    }
  }
  ```

### 3.3. Send a Chat Message (Alias via `/api/chat/send`)

- **Endpoint:** `POST /api/chat/send`
- **Description:** An alias for sending a message, designed for frontend convenience using the recipient's public `userId` string. Triggers an FCM notification if the recipient is offline.
- **Authentication:** Required.
- **Request Body:**
  ```json
  {
    "to": "USERID123",        // Public `userId` string (e.g., "R2C20251109001")
    "message": "Hello there!", // Message text content
    "attachment": {             // Optional: if sending an attachment
        "type": "image" | "video" | "file",
        "url": "https://example.com/uploaded_attachment.jpg"
    }
  }
  ```
- **Success Response (201):** Returns the newly created message object in the same format as `/api/messages/send`.

### 3.4. Update Conversation Metadata

- **Endpoint:** `PUT /api/conversations/:otherUserId/metadata`
- **Description:** Updates various settings for a specific chat conversation with `otherUserId` (e.g., block user, pin chat, custom ringtone).
- **Authentication:** Required.
- **URL Parameters:**
  - `otherUserId`: The `_id` (ObjectId) of the other user in the conversation.
- **Request Body (Example):**
  ```json
  {
    "isBlocked": true,
    "isPinned": false,
    "customRingtone": null,
    "isFavorite": true
  }
  ```
- **Success Response (200):** Returns the updated metadata object.

---

## 4. Real-time Communication (Socket.IO) for Chat

Connect to the WebSocket server using `socket.io-client` for real-time messaging and status updates.

### 4.1. Connection

- **Method:** Connect using `socket.io-client`
- **URL:** `ws://your_backend_address` (e.g., `ws://localhost:5000`)
- **Authentication:** Pass JWT in the query parameter during connection:
  `io(API_URL, { query: { token: 'YOUR_JWT_TOKEN' } })`

### 4.2. Client-to-Server Events (Frontend to Backend)

- **`sendMessage`:**
  - **Description:** Emitted when the user sends a new message (text or attachment).
  - **Payload:**
    ```json
    {
      "recipientId": "ID_OF_OTHER_USER", // MongoDB ObjectId of the recipient
      "text": "The message content",     // Can be empty if attachment exists
      "attachment": {                    // Optional
        "type": "image" | "video" | "file",
        "url": "URL_TO_UPLOADED_ATTACHMENT" // This URL must be pre-uploaded.
      }
    }
    ```
  - **Backend Action:** Saves message to database, emits `receiveMessage` to recipient (if online) and sender, sends FCM notification (if recipient is offline or online but not in chat), and may emit `messageStatusUpdate` to sender if delivered instantly.

- **`typing`:**
  - **Description:** Emitted when the user starts typing.
  - **Payload:** `{ "recipientId": "ID_OF_OTHER_USER" }`

- **`stopTyping`:**
  - **Description:** Emitted when the user stops typing.
  - **Payload:** `{ "recipientId": "ID_OF_OTHER_USER" }`

- **`messageDelivered` (NEW):**
  - **Description:** Emitted by the client when it successfully receives a message. This updates the message status on the server.
  - **Payload:**
    ```json
    {
      "messageId": "ID_OF_RECEIVED_MESSAGE" // MongoDB ObjectId of the message
    }
    ```
  - **Backend Action:** Updates message status to `'delivered'` in the database, sets `deliveredAt` timestamp, and emits `messageStatusUpdate` to the original sender.

- **`messageRead` (NEW):**
  - **Description:** Emitted by the client when the user reads a message (e.g., enters the chat screen).
  - **Payload:**
    ```json
    {
      "messageId": "ID_OF_READ_MESSAGE" // MongoDB ObjectId of the message
    }
    ```
  - **Backend Action:** Updates message status to `'read'` in the database, sets `readAt` timestamp, and emits `messageStatusUpdate` to the original sender.

### 4.3. Server-to-Client Events (Backend to Frontend)

- **`receiveMessage`:**
  - **Description:** Backend emits this to the recipient (and echoes to the sender for optimistic updates) when a new message is sent.
  - **Payload:** Full message object as per the Message Schema, with `sender` (and `recipient`) populated as a `User` object.
    ```json
    {
      "_id": "SERVER_GENERATED_MESSAGE_ID",
      "conversationId": "CONVERSATION_ID",
      "sender": {
        "_id": "SENDER_USER_ID",
        "userId": "SENDER_DISPLAY_ID",
        "name": "Sender Name",
        "photoURL": "Sender Avatar URL"
      },
      "recipient": { // Populated recipient (optional, but good for consistency)
        "_id": "RECIPIENT_USER_ID",
        "userId": "RECIPIENT_DISPLAY_ID",
        "name": "Recipient Name",
        "photoURL": "Recipient Avatar URL"
      },
      "text": "The message content",
      "attachment": { "type": "image", "url": "..." }, // Optional
      "status": "sent", // Initial status (might be 'delivered' if recipient is online in chat)
      "deliveredAt": null,
      "readAt": null,
      "createdAt": "ISO_DATE_STRING",
      "updatedAt": "ISO_DATE_STRING"
    }
    ```
    **Note for GiftedChat:** The `_id` and `createdAt` from the server are critical for `GiftedChat` to function correctly and for message deduping (replacing optimistic messages).

- **`typingStatus`:**
  - **Description:** Informs a user about the typing status of another user in a conversation.
  - **Payload:** `{ "senderId": "TYPING_USER_ID", "isTyping": true | false }`

- **`userStatus`:**
  - **Description:** Broadcasts a user's online/offline status to their friends.
  - **Payload:**
    ```json
    {
      "userId": "USER_WHOSE_STATUS_CHANGED_ID",
      "isOnline": true | false,
      "lastSeen": "ISO_DATE_STRING" // Only present if isOnline is false
    }
    ```

- **`messageStatusUpdate` (NEW):**
  - **Description:** Backend emits this to the message sender when a message's status changes (e.g., from `'sent'` to `'delivered'`, or `'delivered'` to `'read'`).
  - **Payload:**
    ```json
    {
      "_id": "MESSAGE_ID_TO_UPDATE",
      "status": "delivered" | "read",
      "deliveredAt": "ISO_DATE_STRING" | null, // Present if status is 'delivered' or 'read'
      "readAt": "ISO_DATE_STRING" | null      // Present if status is 'read'
    }
    ```

---

## 5. Push Notifications (FCM) Requirements

The backend sends FCM push notifications for new messages, friend requests, and status changes. The user explicitly requested screen pop-up and default mobile tone for new messages.

### 5.1. Backend Action for New Message Notification

When the backend receives a `sendMessage` event (via WebSocket or HTTP API):
1.  Save the message to the database with initial status `'sent'`.
2.  Emit `receiveMessage` via Socket.IO to the recipient (if online).
3.  **Crucially:** Send an FCM push notification to the `recipientId`'s device(s) if they are not actively in the chat with the sender.

### 5.2. FCM Payload (Recommended Structure for New Message)

For a rich, interactive notification, the backend sends both a `notification` payload (for display) and a `data` payload (for in-app handling).

**Example FCM Payload for a New Message:**

```json
{
  "to": "FCM_DEVICE_TOKEN_OF_RECIPIENT",
  "notification": {
    "title": "New Message from [Sender Name]",
    "body": "[Message Text Preview]...", // Max ~200 chars or first line of text
    "sound": "default",                   // Plays default notification sound
    "priority": "high",                   // Ensures immediate display on some platforms
    "android_channel_id": "chat_messages" // Required for Android Oreo+ for custom sounds/settings
  },
  "data": {
    "type": "chat_message",
    "otherUserId": "SENDER_USER_ID",        // The _id of the user who sent the message (the chat partner for the recipient)
    "otherUserName": "Sender Name",         // The name of the sender
    "otherUserPhotoURL": "Sender Avatar URL", // The avatar URL of the sender
    "conversationId": "CONVERSATION_ID", // MongoDB ObjectId of the conversation - Important for navigating to the correct chat
    "messageId": "MESSAGE_ID",           // MongoDB ObjectId of the new message
    "text": "Full message text (optional, for direct display in app)",
    "timestamp": "ISO_DATE_STRING"
  }
}
```

**Backend Responsibilities for FCM:**
- Store FCM device tokens for each user using the `FCMToken` model.
- Associate `recipientId` with their active FCM tokens.
- Construct and send the FCM payload when a new message arrives.
- **Crucially:** Ensure the `data` payload for `chat_message` notifications includes `otherUserId`, `otherUserName`, and `otherUserPhotoURL` corresponding to the sender of the message. This data is used by the frontend's `MessageScreen.tsx` to identify the chat partner and display their profile information, especially when navigating directly from a notification.

---

## 6. Console Logging Requirements (for Debugging/Verification)

For enhanced debugging and verification, the backend must output specific console logs:

- **User Connection/Disconnection:**
  - `[Socket] User connected: [userId] ([_id]) with socket ID [socket.id]`
  - `[Socket] User disconnected: [userId] ([_id]) with socket ID [socket.id]`
- **UserData Updates:**
  - `[DB] UserData for [userId] updated: isOnline = true`
  - `[DB] UserData for [userId] updated: isOnline = false, lastActive = [timestamp]`
- **User Status Broadcasts:**
  - `[Socket] Emitting 'userStatus' for [userId] ([online/offline]) to friend [friendId]`
- **Message Sending (Socket.IO):**
  - `[Socket] Message received from [senderId] for [recipientId]. Content: [text/attachment details]`
  - `[DB] New conversation [conversationId] created between [senderId] and [recipientId]`
  - `[DB] Message [messageId] stored. Status: [status]`
  - `[Socket] Emitting 'receiveMessage' to [online/offline] recipient [recipientId] for message [messageId]`
  - `[Socket] Emitting 'receiveMessage' to sender [senderId] for message [messageId]`
- **Message Sending (HTTP API):**
  - `[HTTP] Message received from [senderId] (HTTP). Content: [text/attachment details]`
  - `[DB] New conversation [conversationId] created between [senderId] and [recipientId] (HTTP)`
  - `[DB] Message [messageId] stored. Status: [status] (HTTP)`
- **FCM Notifications:**
  - `[FCM] Notification triggered for recipient [recipientId] for message [messageId]`
  - `[FCM] Notification triggered for recipient [recipientId] for message [messageId] (HTTP)`
  - `[FCM] Notification sent to [recipientId] for message [messageId]. Title: [Title], Body: [Body]` (This log is from `fcmService.js`)
- **Typing Status:**
  - `[Socket] User [userId] is typing for [recipientId]`
  - `[Socket] User [userId] stopped typing for [recipientId]`
- **Message Status Updates:**
  - `[Socket] Received 'messageDelivered' for message [messageId] from [userId]`
  - `[DB] Message [messageId] status updated to 'delivered'`
  - `[Socket] Emitting 'messageStatusUpdate' (delivered) to sender [senderId] for message [messageId]`
  - `[Socket] Received 'messageRead' for message [messageId] from [userId]`
  - `[DB] Message [messageId] status updated to 'read'`
  - `[Socket] Emitting 'messageStatusUpdate' (read) to sender [senderId] for message [messageId]`
- **Error Logs:** All errors should be `console.error` with context.

---

## 7. Error Handling

API responses for HTTP requests will use standard HTTP status codes. A generic error response body will be:
```json
{
  "success": false,
  "message": "A description of the error."
}
```
- `400 Bad Request`: Invalid request body or parameters.
- `401 Unauthorized`: Invalid or missing JWT.
- `404 Not Found`: Resource not found.
- `500 Internal Server Error`: Server-side error.