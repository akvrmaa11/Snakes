const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb'); // Using native driver as in user's repo base
const path = require('path'); // Path module needed for static files
const { v4: uuidv4 } = require('uuid'); // New: For generating unique IDs (like for messages)


const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://amitdatabase:1234%40ami@amidetabase.n1a11qd.mongodb.net/?retryWrites=true&w=majority&appName=amidetabase';
const DB_NAME = 'amidetabase';
const COLLECTION_NAME = 'messages';

let db; // MongoDB database client instance

// Function to establish connection with MongoDB Atlas
async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect();
        db = client.db(DB_NAME);
        console.log('MongoDB connected successfully');

        // Create an index on the 'timestamp' field for faster chat history retrieval
        await db.collection(COLLECTION_NAME).createIndex({ timestamp: 1 });
        console.log('MongoDB index on timestamp created/ensured.');

    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit if DB connection fails
    }
}

app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Online Status & Typing Indicator Variables (Server-side) ---
let connectedSockets = {}; // { socket.id: USER_ID } - Tracks all active socket connections
let typingUsers = {}; // { USER_ID: true } - Tracks unique users who are currently typing

// Helper function to update unique online users and broadcast count
function updateOnlineStatusAndBroadcast() {
    const uniqueOnlineUserIds = new Set(Object.values(connectedSockets)); // Get unique USER_IDs from all connected sockets
    const count = uniqueOnlineUserIds.size;
    console.log(`Server: Broadcasting online users count: ${count}`);
    io.emit('onlineUsersCount', count); // Emit to all clients
}

// --- Socket.IO Connection and Event Handlers ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // New: Handle user coming online (when they enter the chat)
    // This event is emitted by the client after successful password entry.
    socket.on('userOnline', (userId) => {
        if (!userId) { // Basic validation
            console.warn(`Server: userOnline event received with no userId from socket ${socket.id}`);
            return;
        }
        connectedSockets[socket.id] = userId; // Map socket to USER_ID
        console.log(`Server: Socket ${socket.id} mapped to USER_ID: ${userId}`);
        updateOnlineStatusAndBroadcast(); // Update and broadcast count
        
        // Also, inform new connecting user about current typing users (if any)
        if (Object.keys(typingUsers).length > 0) {
            // Send 'typing' event for any user currently typing (excluding self)
            const typers = Object.keys(typingUsers).filter(typerId => typerId !== userId);
            if (typers.length > 0) {
                socket.emit('typing', typers[0]); // Sending first typer ID as a generic "someone typing"
            }
        }
    });

    // Handle user disconnecting
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        // Find the userId associated with this socket and remove them
        const disconnectedUserId = connectedSockets[socket.id];
        if (disconnectedUserId) {
            delete connectedSockets[socket.id];
            // Also remove from typing users if they disconnect suddenly (without sending stoppedTyping)
            if (typingUsers[disconnectedUserId]) {
                delete typingUsers[disconnectedUserId];
                socket.broadcast.emit('stoppedTyping', disconnectedUserId); // Inform others
                console.log(`Server: User ${disconnectedUserId} stopped typing due to disconnect.`);
            }
            updateOnlineStatusAndBroadcast(); // Update and broadcast count
            // New: Broadcast user offline status to others
            socket.broadcast.emit('userOffline', disconnectedUserId); // Inform others that this specific user is offline
        }
    });

    // Handle new messages
    socket.on('sendMessage', async (msgData) => {
        console.log(`Server: Received message from ${msgData.senderId}: "${msgData.content}"`); // Debug log
        try {
            // Generate a unique ID for the message using uuidv4
            const messageId = uuidv4();
            const messageToSave = {
                _id: messageId, // Assign generated UUID
                senderId: msgData.senderId,
                content: msgData.content,
                timestamp: new Date(),
                replyToMessageId: msgData.replyToMessageId || null,
                isDeleted: false
            };

            // Insert message into MongoDB
            await db.collection(COLLECTION_NAME).insertOne(messageToSave);
            
            // Stop typing status for this user after message is sent
            if (typingUsers[msgData.senderId]) {
                delete typingUsers[msgData.senderId];
                socket.broadcast.emit('stoppedTyping', msgData.senderId); // Inform others
                console.log(`Server: User ${msgData.senderId} stopped typing after sending message.`);
            }

            io.emit('newMessage', messageToSave); // Broadcast to all connected clients
            console.log(`Server: Broadcasted new message with ID: ${messageToSave._id}`);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    // Handle request for chat history
    socket.on('requestChatHistory', async (userId) => {
        console.log(`Server: Requesting chat history for user ${userId}`); // Debug log
        try {
            // Only fetch messages that are NOT marked as deleted
            const history = await db.collection(COLLECTION_NAME).find({ isDeleted: false }).sort({ timestamp: 1 }).toArray();
            console.log(`Server: Sending chat history to user ${userId}. History count: ${history.length}`);
            socket.emit('chatHistory', history);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    });

    // Handle message deletion
    socket.on('deleteMessage', async (messageId, userId) => {
        console.log(`Server: Received delete request for message ${messageId} from user ${userId}`); // Debug log
        try {
            // Convert string messageId to ObjectId for MongoDB query
            const messageObjectId = new ObjectId(messageId); 

            const message = await db.collection(COLLECTION_NAME).findOne({ _id: messageObjectId });
            if (message && message.senderId === userId) { // Only allow sender to delete
                const result = await db.collection(COLLECTION_NAME).updateOne(
                    { _id: messageObjectId },
                    { $set: { isDeleted: true, content: 'This message was deleted.' } }
                );
                if (result.modifiedCount > 0) {
                    const updatedMessage = await db.collection(COLLECTION_NAME).findOne({ _id: messageObjectId });
                    io.emit('messageUpdated', updatedMessage); // Inform all clients
                    console.log(`Server: Message ${messageId} soft-deleted by ${userId}`);
                }
            } else {
                console.warn(`Server: Unauthorized delete attempt for message ${messageId} by ${userId}. Sender mismatch or message not found.`);
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    });

    // Handle global chat history deletion
    socket.on('deleteAllMessagesGlobal', async () => {
        console.log("Server: Received request to delete all messages globally."); // Debug log
        try {
            // Update all messages to be deleted
            const result = await db.collection(COLLECTION_NAME).updateMany(
                {}, // Empty filter means update all documents
                { $set: { isDeleted: true, content: 'This chat history was cleared.' } }
            );
            console.log(`Server: All messages globally soft-deleted. Count: ${result.modifiedCount}`);
            io.emit('chatHistory', []); // Send empty history to all clients to clear their view
        } catch (error) {
            console.error('Error deleting all messages:', error);
        }
    });

    // Handle typing indicator events
    socket.on('typing', (userId) => {
        if (userId && !typingUsers[userId]) { // Add to typing list only if not already there
            typingUsers[userId] = true;
            // Broadcast to all OTHER clients (excluding the sender themselves)
            socket.broadcast.emit('typing', userId);
            console.log(`User ${userId} is typing.`);
        }
    });

    socket.on('stoppedTyping', (userId) => {
        if (userId && typingUsers[userId]) { // Remove from typing list only if they were marked as typing
            delete typingUsers[userId];
            // Broadcast to all OTHER clients (excluding the sender themselves)
            socket.broadcast.emit('stoppedTyping', userId);
            console.log(`User ${userId} stopped typing.`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    await connectDB();
    console.log(`Server running on port ${PORT}`);
});
