# User Authentication Flow and Endpoints

This document outlines the authentication and user management flow for the Reals2Chat application.

## Overview

The authentication system supports phone number (via Firebase), Google Sign-In, and traditional email/password login. When a user logs in or registers, the backend provides a JSON Web Token (JWT) that must be included in the `Authorization` header for all subsequent protected API requests (e.g., `Authorization: Bearer <token>`).

## Backend Server Information

The backend server runs on `http://localhost:5000`.

When testing from an Android emulator, the backend is accessible at `http://10.0.2.2:5000`.

All API endpoints listed below should be prefixed with this base URL.

## Endpoints

Below are the key endpoints for authentication and user management.

---

### 1. Phone Verification / Login

*   **URL**: `http://localhost:5000/api/auth/verify-phone`
*   **Method**: `POST`
*   **Description**: This is the primary endpoint for phone-based login and registration. After the client verifies a phone number with Firebase, it should send the phone number to this endpoint. The backend will either find the existing user or create a new one.
*   **Request Body**:
    ```json
    {
      "phoneNumber": "+1234567890"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "token": "your_jwt_token",
      "user": {
        "id": "60d5ecb8b48f5a3e7c8b4567",
        "userId": "USER12345",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+1234567890",
        "registrationComplete": true
      }
    }
    ```

---

### 2. Google Sign-In

*   **URL**: `http://localhost:5000/api/auth/google-signin`
*   **Method**: `POST`
*   **Description**: Handles user login and registration via Google. The client should send the `idToken` received from the Google Sign-In process.
*   **Request Body**:
    ```json
    {
      "idToken": "google_id_token"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "token": "your_jwt_token",
      "user": {
        "id": "60d5ecb8b48f5a3e7c8b4567",
        "userId": "USER12345",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "photoURL": "https://example.com/avatar.jpg",
        "registrationComplete": false
      }
    }
    ```

---

### 3. Email & Password Login

*   **URL**: `http://localhost:5000/api/auth/login`
*   **Method**: `POST`
*   **Description**: Authenticates a user with their email and password.
*   **Request Body**:
    ```json
    {
      "email": "user@example.com",
      "password": "user_password"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "token": "your_jwt_token",
      "user": {
        "id": "60d5ecb8b48f5a3e7c8b4567",
        "userId": "USER12345",
        "name": "John Doe",
        "email": "user@example.com",
        "registrationComplete": true
      }
    }
    ```

---

### 4. User Registration (with Email)

*   **URL**: `http://localhost:5000/api/auth/register`
*   **Method**: `POST`
*   **Description**: Creates a new user account.
*   **Request Body**:
    ```json
    {
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "password": "strong_password",
      "userId": "JANE987",
      "dateOfBirth": "1995-05-15",
      "gender": "female"
    }
    ```
*   **Success Response (201 Created)**:
    ```json
    {
      "success": true,
      "token": "your_jwt_token",
      "user": {
        "id": "60d5f0b5b48f5a3e7c8b4568",
        "userId": "JANE987",
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "registrationComplete": true
      }
    }
    ```

---

### 5. Get Current User Profile

*   **URL**: `http://localhost:5000/api/auth/me`
*   **Method**: `GET`
*   **Description**: Retrieves the complete profile of the currently authenticated user. This endpoint should be called after the app starts and a token is found, or when navigating to the profile page to ensure you have the latest user data. Requires a valid JWT in the `Authorization` header.
*   **Request Body**: None
*   **Success Response (200 OK)**:
    ```json
    {
      "id": "69109fb935af8e20a9e0f9c4",
      "userId": "SUGUMAR2001",
      "name": "Sugumar Jagadeesh",
      "email": "sugumarjagadeeshsd@gmail.com",
      "phone": "9963633322",
      "dateOfBirth": "2001-01-01T00:00:00.000Z",
      "gender": "male",
      "isPhoneVerified": true,
      "isEmailVerified": true,
      "registrationComplete": true
    }
    ```

---

### 6. Update User Profile

*   **URL**: `http://localhost:5000/api/auth/update-profile`
*   **Method**: `POST`
*   **Description**: Updates the profile of the authenticated user. This is crucial for completing registration after a phone or Google login. Requires a valid JWT.
*   **Request Body**:
    ```json
    {
      "name": "John Doe Updated",
      "dateOfBirth": "1990-01-01",
      "gender": "male"
    }
    ```
*   **Success Response (200 OK)**:
    ```json
    {
      "success": true,
      "token": "new_jwt_token_if_regenerated",
      "user": {
        "id": "60d5ecb8b48f5a3e7c8b4567",
        "name": "John Doe Updated",
        "email": "john.doe@example.com",
        "phone": "+1234567890"
      }
    }
    ```

## Authentication Flows

### Phone Number Authentication Flow

1.  **Client**: User enters their phone number.
2.  **Client**: Use Firebase Authentication to send an OTP to the user's phone.
3.  **Client**: User enters the received OTP.
4.  **Client**: After Firebase confirms the OTP, get the user's phone number.
5.  **Client**: Send the phone number to the backend via `POST /api/auth/verify-phone`.
6.  **Backend**: Responds with a JWT and user data.
7.  **Client**: Store the JWT and user data. If `user.registrationComplete` is `false`, navigate the user to a profile completion screen.

### Google Sign-In Flow

1.  **Client**: User taps the "Sign in with Google" button.
2.  **Client**: Use the Google Sign-In library to get an `idToken`.
3.  **Client**: Send the `idToken` to the backend via `POST /api/auth/google-signin`.
4.  **Backend**: Verifies the token, finds or creates a user, and returns a JWT and user data.
5.  **Client**: Store the JWT and user data. If `user.registrationComplete` is `false`, navigate the user to a profile completion screen.

## Fetching User Data After Login

To automatically fetch user data when the app starts or when the user is already logged in, follow this flow:

1.  **Store the Token**: After a successful login or registration, securely store the JWT token you receive from the backend. `AsyncStorage` is a good option for this in React Native.
2.  **Check for Token on App Start**: When your application first loads, check if there is a JWT token stored in `AsyncStorage`.
3.  **Fetch User Data**: If a token is found, it means the user is already logged in. You should then make a `GET` request to the `/api/auth/me` endpoint.
    *   **Important**: You must include the JWT in the `Authorization` header of your request, like this:
        ```
        Authorization: Bearer <your_stored_jwt_token>
        ```
4.  **Update User Context**: The `/api/auth/me` endpoint will return the full user object. Use this data to populate your `UserContext` or state management system. This will make the user data available throughout your app.
5.  **Navigate**: Once the user data is fetched and your context is updated, you can navigate the user to the main home screen of your app.

This process ensures that your app always has the most up-to-date user information and provides a seamless experience for returning users.
