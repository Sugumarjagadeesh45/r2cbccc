# 🚀 FCM & Message API Testing Guide

Use this guide to verify your Message APIs correctly.

**Base URL:** `http://<YOUR_LOCAL_IP>:5000`  
*(Replace `<YOUR_LOCAL_IP>` with your PC's IP, e.g., `192.168.1.10`)*

---

## 1. ✅ Send Message (Correct Request)

Use this to send a message and trigger a notification.

- **Method:** `POST`
- **URL:** `/api/messages`
- **Headers:**
  - `Content-Type`: `application/json`
  - `Authorization`: `Bearer <YOUR_LOGIN_JWT_TOKEN>`
  
  > ⚠️ **CRITICAL NOTE:**  
  > Do **NOT** use the FCM Token (starts with `cEfJe...`).  
  > You **MUST** use the JWT Token (starts with `eyJ...`) that you get after logging in.

- **Body:**
  ```json
  {
    "recipientId": "695fdc919fcc861e011b84c0",
    "text": "Testing FCM Sound 123 🔔"
  }
  ```

---

## 2. ❌ Troubleshooting Errors

### 🔴 Error: `JsonWebTokenError: jwt malformed`
*   **Log:** `Auth middleware error: JsonWebTokenError: jwt malformed`
*   **Cause:** You put the **FCM Token** in the `Authorization` header.
*   **Fix:** Login to the app, copy the `accessToken` (JWT), and use that in the header.

### 🔴 Error: `Cannot POST /api/user/profile`
*   **Log:** `Cannot POST /api/user/profile`
*   **Cause:** You are trying to POST to a GET endpoint.
*   **Fix:**
    *   To **fetch** profile: Use `GET /api/user/profile`
    *   To **update** profile: Use `PUT /api/user/profile`

---

## 3. 🔔 Fixing "No Sound + Pop-up" (Real Device)

You mentioned: *"Console perfectly working... but real device was not receive a sound + screen pop-up"*

### The Reason
Firebase **does not** show pop-ups or play sounds when the app is **OPEN (Foreground)**. It only sends the data silently to your code.

### The Solution (Frontend Code)
You must edit your **React Native Frontend** file (`pushNotificationHelper.js`) to manually trigger the notification.

**File:** `pushNotificationHelper.js`

```javascript
import PushNotification from "react-native-push-notification";
import messaging from '@react-native-firebase/messaging';

// 1. Create the Channel (Call this once in App.tsx or helper)
PushNotification.createChannel(
  {
    channelId: "chat_messages", // MUST match backend 'channelId'
    channelName: "Chat Messages",
    soundName: "default",
    importance: 4, // High importance
    vibrate: true,
  },
  (created) => console.log(`createChannel returned '${created}'`)
);

// 2. Handle Foreground Messages
messaging().onMessage(async remoteMessage => {
  console.log("Foreground Message:", remoteMessage);

  // 🚨 MANUALLY SHOW NOTIFICATION
  PushNotification.localNotification({
    channelId: "chat_messages", 
    title: remoteMessage.notification.title,
    message: remoteMessage.notification.body,
    playSound: true,
    soundName: "default",
    priority: "high",
    vibrate: true
  });
});
```