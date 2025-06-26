const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { MongoClient, ObjectId } = require('mongodb'); // Import ObjectId for MongoDB queries
const path = require('path'); // Path module to handle file paths correctly

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- MongoDB Connection Configuration ---
// IMPORTANT: For production, always use environment variables for sensitive information
// like database URIs and passwords (e.g., process.env.MONGODB_URI).
// Hardcoding is for development/testing purposes only.
const MONGODB_URI = 'mongodb+srv://amitdatabase:1234%40ami@amidetabase.n1a11qd.mongodb.net/?retryWrites=true&w=majority&appName=amidetabase'; // <-- Tumhari MongoDB Atlas URI yahan hai
const DB_NAME = 'amidetabase'; // Tumhare appName ke according database ka naam
const COLLECTION_NAME = 'messages'; // Collection ka naam jahan messages store honge

let db; // MongoDB database object

// Function to establish connection with MongoDB Atlas
async function connectDB() {
    try {
        const client = new MongoClient(MONGODB_URI);
        await client.connect(); // Connect to the MongoDB cluster
        db = client.db(DB_NAME); // Select the database
        console.log('Connected to MongoDB');

        // Create an index on the 'timestamp' field for faster chat history retrieval
        // This makes sorting and querying by time more efficient.
        await db.collection(COLLECTION_NAME).createIndex({ timestamp: 1 });
        console.log('MongoDB index on timestamp created/ensured.');

    } catch (error) {
        console.error('MongoDB connection error:', error);
        // If connection fails, log the error and exit the process
        process.exit(1);
    }
}

// Serve static files from the 'public' directory
// path.join(__dirname, '..', 'public') ensures that the 'public' folder is
// correctly located one level up from the 'server' directory where index.js resides.
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- Socket.IO Connection and Event Handlers ---
// This handles real-time communication between the server and connected clients
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Event listener for client requests to fetch chat history
    socket.on('requestChatHistory', async (userId) => {
        try {
            // Fetch only messages that have NOT been marked as deleted (isDeleted: false)
            // Messages are sorted by timestamp in ascending order to maintain chat flow.
            const messages = await db.collection(COLLECTION_NAME)
                                    .find({ isDeleted: false }) // <-- Only fetch non-deleted messages
                                    .sort({ timestamp: 1 })
                                    .toArray();
            socket.emit('chatHistory', messages); // Send the fetched history back to the requesting client
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    });

    // Event listener for clients sending new messages
    socket.on('sendMessage', async (msg) => {
        try {
            // Create a new message object with necessary details
            const newMessage = {
                senderId: msg.senderId,      // ID of the user sending the message
                content: msg.content,        // The actual message text
                timestamp: new Date(),       // Server-side timestamp for accuracy
                isDeleted: false,            // Flag to mark if message is deleted (default false)
                replyToMessageId: msg.replyToMessageId || null // ID of the message this is a reply to, if any
            };
            // Insert the new message into the MongoDB collection
            const result = await db.collection(COLLECTION_NAME).insertOne(newMessage);
            // Add the MongoDB-generated _id to the message object before broadcasting
            newMessage._id = result.insertedId;
            // Broadcast the new message to all connected clients in real-time
            io.emit('newMessage', newMessage);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });

    // Event listener for clients requesting to delete a message
    // Now also receives the userId from the client for verification
    socket.on('deleteMessage', async (messageId, userId) => {
        try {
            // Ensure messageId valid ObjectId hai
            if (!ObjectId.isValid(messageId)) {
                console.warn(`Invalid messageId for deletion: ${messageId}`);
                return;
            }

            // Fetch the message from DB to verify sender
            const messageToDelete = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(messageId) });

            if (!messageToDelete) {
                console.warn(`Message with ID ${messageId} not found.`);
                return;
            }

            // IMPORTANT SECURITY CHECK: Only allow sender to delete their own message
            // This prevents a user from deleting messages sent by others.
            if (messageToDelete.senderId !== userId) {
                console.warn(`User ${userId} attempted to delete message ID ${messageId} not sent by them.`);
                socket.emit('deleteError', 'You can only delete your own messages.');
                return;
            }

            const result = await db.collection(COLLECTION_NAME).updateOne(
                { _id: new ObjectId(messageId) },
                { $set: { isDeleted: true, content: 'This message was deleted.' } }
            );
            if (result.modifiedCount > 0) {
                const updatedMessage = await db.collection(COLLECTION_NAME).findOne({ _id: new ObjectId(messageId) });
                io.emit('messageUpdated', updatedMessage); // Broadcast update to all clients
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    });

    // New Event Listener: Delete all messages in the entire chat globally
    // This handler removes the senderId filter from updateMany.
    socket.on('deleteAllMessagesGlobal', async () => { // Event name changed, no userId parameter needed
        try {
            // Update many documents: set isDeleted to true for ALL messages in the collection
            const result = await db.collection(COLLECTION_NAME).updateMany(
                {}, // <-- Filter removed: now applies to all documents
                { $set: { isDeleted: true, content: 'This chat history was cleared.' } } // Optional: custom message
            );
            console.log(`Global chat history cleared. Deleted ${result.modifiedCount} messages.`);

            // After deletion, re-fetch and broadcast updated history to all clients
            const updatedHistory = await db.collection(COLLECTION_NAME)
                                            .find({ isDeleted: false }) // Fetch only non-deleted messages after mass delete
                                            .sort({ timestamp: 1 })
                                            .toArray();
            io.emit('chatHistory', updatedHistory); // Re-emit full chat history to refresh all clients

        } catch (error) {
            console.error('Error deleting all messages globally:', error);
        }
    });

    // Event listener for client disconnections
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// --- Server Startup ---
// Listen on the port provided by the environment (e.g., Render) or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, async () => {
    // Connect to MongoDB before starting to listen for client connections
    await connectDB();
    console.log(`Server running on http://localhost:${PORT}`);
});
