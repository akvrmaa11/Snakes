# My Secret Chat App

A unique and discreet chat application featuring a hidden access mechanism disguised as a classic Snake game. Users type a secret "Game ID" (password) to reveal a WhatsApp-like live chat interface. All chat messages are stored in a MongoDB database, supporting real-time messaging, message deletion (sender's own messages only), replies, and a new "Delete All My Messages" feature.

## Features

* **Hidden Access:** A playable Snake game on the landing page, with a separate "Create Game ID" (text input) and "Join" button to access the chat.
* **Playable Snake Game:** Time-pass game with wrap-around walls and customizable speed. Snake segments have rounded corners and a distinct head, now rendered in higher "HD" quality. Game header removed.
* **Text Input Password:** Access the chat by typing a secret password (e.g., "secretchat123") into the "Create Game ID" field.
* **WhatsApp-like UI:** Intuitive and familiar chat interface with left/right message bubbles, now with a minimal header (no "Secret Chat" text).
* **Real-time Chat:** Powered by WebSockets (Socket.IO) for instant message delivery.
* **MongoDB Storage:** All chat history is persistently stored in a MongoDB database (deleted messages are filtered out from history display).
* **Message Delete (Sender Only):** Users can delete their own sent messages. These messages are marked as deleted in the DB and show "This message was deleted" to all viewers. The server verifies the sender.
* **Delete Entire Chat History:** A button to delete *all* messages in the entire chat for all users. **(Use with extreme caution - this action is irreversible for the chat history)**.
* **Reply to Messages:** Users can reply to any specific message, with the original message content quoted in the reply. Includes a cancel reply option.
* **No Traditional Login:** Users are identified via a unique ID stored in their browser's local storage/cookies, maintaining anonymity while preserving chat history per device.

## Technologies Used

* **Frontend:**
    * HTML, CSS, JavaScript
    * HTML Canvas (for Snake game rendering)
    * UUID.js (for client-side unique ID generation)
* **Backend:**
    * Node.js with Express.js
    * Socket.IO (for WebSockets)
    * MongoDB (for database)

## Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/akvrmaa11/Secret-chat2.1.git](https://github.com/akvrmaa11/Secret-chat2.1.git) # Replace with your actual repo URL if different
    cd Secret-chat2.1 # Or whatever your root folder is named
    ```

2.  **Install Backend Dependencies:**
    Navigate to the `server` directory and install Node.js packages:
    ```bash
    cd server
    npm install
    ```

3.  **Set up MongoDB Atlas:**
    * Ensure you have a MongoDB Atlas account and a cluster running.
    * Create a **Database User** with `readWriteAnyDatabase` (or specific database) permissions. Remember your username and password.
    * In MongoDB Atlas, go to **Network Access** and add your current IP address. For Render deployment, you will need to add `0.0.0.0/0` (Allow access from anywhere) in Network Access for testing purposes. (Note: For production, use Render's specific outbound IP addresses for better security if available, or restrict as much as possible.)
    * Copy your MongoDB Atlas connection string (ensure the password is URL-encoded if it contains special characters like `@`).

4.  **Configure Environment Variable (for Render Deployment):**
    * **On Render:** When creating/configuring your Web Service on Render, add an Environment Variable:
        * **Key:** `MONGODB_URI`
        * **Value:** Your complete MongoDB Atlas connection string.
    * *(Note: The `server/index.js` provided here has the URI hardcoded for simplicity in this guide. In a real project, it would use `process.env.MONGODB_URI`.)*

5.  **Run the Server (Locally for Testing):**
    From the `server` directory, start the Node.js server:
    ```bash
    npm start
    ```
    The server will typically run on `http://localhost:3000`.

6.  **Access the Application (Locally):**
    Open your web browser and navigate to `http://localhost:3000`.

## Usage

1.  When you open the application, you will see the **"SNAKE"** screen with a playable snake game (no header text).
2.  To access the chat, type the secret password (`secretchat123` by default, configurable in `public/script.js`) into the **"Create Game ID..."** input field and click **"Join"**.
3.  Upon successful password entry, the game screen will transition to the **secret chat interface** (no header text).
4.  Type your messages and send them.
5.  **Reply:** Click or right-click (or long-press on mobile) on any message to see the "Reply" option. Clicking it will set the reply context in the input field.
6.  **Cancel Reply:** Click the "✖" button next to the "Replying to:" text to cancel the reply context.
7.  **Delete My Message:** Click or right-click on *your own* sent messages to see the "Delete" option. This will mark the message as deleted in the database, and it will appear as "This message was deleted" for everyone viewing the chat.
8.  **Delete Entire Chat History:** Use the button in the chat header to delete *all* messages in the chat for all users. **(Use with extreme caution - this action is irreversible for the chat history)**.

## Important Notes

* **Identity & Persistence:** Users are identified by a unique ID stored in their browser's local storage. If local storage is cleared, a new ID is generated, and past messages linked to the old ID cannot be controlled by the new ID (e.g., deleted by that new ID).
* **Security:** This application relies on "security by obscurity" for the password mechanism (it's in client-side JS). For highly sensitive data, a robust server-side authentication system is essential. Never use this application for truly sensitive communications without proper security measures.
* **Error Handling:** Basic error handling is included, but production-ready applications would require more robust error management and user feedback for network/database issues.
* 
