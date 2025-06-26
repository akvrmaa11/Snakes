// --- Game Variables (Real Snake Game) ---
// Global variable declarations (assigned inside window.onload closure)
let canvas, ctx, gameContainer, chatContainer;
let gameUpBtn, gameDownBtn, gameLeftBtn, gameRightBtn; // Snake controls
let gameIdInput, joinButton; // Password related elements
let messageInput, sendButton, replyInfo, replyingToText, cancelReplyBtn, deleteAllMyMessagesBtn; // Chat related elements
let statusIndicator, typingIndicator; // New elements for chat status

const gridSize = 40; // HD quality (double size)
let snake = [{ x: 10 * gridSize, y: 10 * gridSize }]; // Snake starts near center
let food = {};
let dx = gridSize; // Initial direction: right
let dy = 0;
let score = 0;
let changingDirection = false; // To prevent rapid direction change
let gameInterval; // Game speed control ke liye

// --- Password Variables ---
const SECRET_TEXT_PASSWORD = "4407"; // Your secret password is 4407
let passwordSuccess = false; // Initial state

// --- Chat Variables ---
const socket = io(); // Connect to Socket.IO server
let USER_ID = localStorage.getItem('secret_chat_user_id');
if (!USER_ID) {
    USER_ID = uuid.v4(); // Generate a new UUID
    localStorage.setItem('secret_chat_user_id', USER_ID);
}
let messages = []; // Array to hold all messages (for reply logic)

// Typing indicator variables
let typingTimeout;
let isTyping = false; // Flag to track if THIS user is typing
let onlineUsers = {}; // To store other online users (USER_ID -> true)
let typingUsers = {}; // To store other users who are typing (USER_ID -> true)


// --- Main application initialization when the window loads ---
window.onload = function() {
    // Get all DOM elements here, inside window.onload to ensure they are loaded
    canvas = document.getElementById('gameCanvas');
    if (canvas) { // CHECK 1: Ensure canvas element is found
        try {
            ctx = canvas.getContext('2d');
            if (ctx) console.log("Snake Canvas Context obtained successfully.");
            else console.error("Snake Canvas context is NULL. Check browser compatibility.");
        } catch (e) {
            console.error("Error getting Snake Canvas Context:", e);
        }
    } else {
        console.error("Snake Canvas element (id='gameCanvas') not found in HTML!");
    }
    
    gameContainer = document.getElementById('game-container');
    if (!gameContainer) console.error("Game Container element (id='game-container') not found.");
    
    chatContainer = document.getElementById('chat-container');
    if (!chatContainer) console.error("Chat Container element (id='chat-container') not found.");


    // Game controls and password area elements - ALWAYS CHECK IF ELEMENT EXISTS
    gameUpBtn = document.getElementById('game-up-btn');
    if (!gameUpBtn) console.error("Game Up Button not found.");
    
    gameDownBtn = document.getElementById('game-down-btn');
    if (!gameDownBtn) console.error("Game Down Button not found.");
    
    gameLeftBtn = document.getElementById('game-left-btn');
    if (!gameLeftBtn) console.error("Game Left Button not found.");
    
    gameRightBtn = document.getElementById('game-right-btn');
    if (!gameRightBtn) console.error("Game Right Button not found.");
    
    gameIdInput = document.getElementById('game-id-input');
    if (!gameIdInput) console.error("Game ID Input not found.");
    
    joinButton = document.getElementById('join-btn');
    if (!joinButton) console.error("Join button not found.");

    // Chat elements - ALWAYS CHECK IF ELEMENT EXISTS
    messageInput = document.getElementById('message-input');
    if (!messageInput) console.error("Message Input not found.");
    
    sendButton = document.getElementById('send-btn');
    if (!sendButton) console.error("Send Button not found.");
    
    replyInfo = document.getElementById('reply-info');
    if (!replyInfo) console.error("Reply Info not found.");
    
    replyingToText = document.getElementById('replying-to-text');
    if (!replyingToText) console.error("Replying To Text not found.");
    
    cancelReplyBtn = document.getElementById('cancel-reply-btn');
    if (!cancelReplyBtn) console.error("Cancel Reply Button not found.");
    
    deleteAllMyMessagesBtn = document.getElementById('delete-all-my-messages-btn');
    if (!deleteAllMyMessagesBtn) console.error("Delete All My Messages Button not found.");
    
    statusIndicator = document.getElementById('status-indicator');
    if (!statusIndicator) console.error("Status Indicator not found.");
    
    typingIndicator = document.getElementById('typing-indicator');
    if (!typingIndicator) console.error("Typing Indicator not found.");


    // --- Helper function to draw a rounded rectangle (for snake segments) ---
    function drawRoundedRect(ctx, x, y, width, height, radius) {
        if (!ctx) { console.error("drawRoundedRect: Context is NULL."); return; } // Safety check
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2; // Fixed: was a bug here earlier, now corrected
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }


    // --- Real Snake Game Logic ---
    function createFood() {
        if (!canvas) { console.error("createFood: Canvas not available."); return; } // Safety check
        food = {
            x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
            y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
        };

        // Ensure food does not spawn on the snake
        for (let i = 0; i < snake.length; i++) {
            if (food.x === snake[i].x && food.y === snake[i].y) {
                createFood(); // Re-create if on snake
                return;
            }
        }
    }

    function drawSnakePart(snakePart, index) { // index parameter added
        if (!ctx) { console.error("drawSnakePart: Context is NULL."); return; } // Safety check
        // Snake ka head thoda alag color/style ka hoga
        if (index === 0) { // This is the snake's head
            ctx.fillStyle = 'white'; // Head color changed to white
            ctx.strokeStyle = '#27ae60'; // Stroke for head (can remain green or black)
            
            const radius = gridSize / 4; // Rounded corners ka radius
            drawRoundedRect(ctx, snakePart.x, snakePart.y, gridSize, gridSize, radius);
            ctx.fill();
            ctx.stroke();

            // --- Draw Eyes ---
            ctx.fillStyle = 'black'; // Eye color
            const eyeRadius = gridSize * 0.08; // Small eye size

            // Determine eye positions based on snake's direction (dx, dy)
            let eye1X = snakePart.x;
            let eye1Y = snakePart.y;
            let eye2X = snakePart.x;
            let eye2Y = snakePart.y;

            if (dx > 0) { // Moving Right
                eye1X = snakePart.x + gridSize * 0.65; eye1Y = snakePart.y + gridSize * 0.25;
                eye2X = snakePart.x + gridSize * 0.65; eye2Y = snakePart.y + gridSize * 0.75;
            } else if (dx < 0) { // Moving Left
                eye1X = snakePart.x + gridSize * 0.35; eye1Y = snakePart.y + gridSize * 0.25;
                eye2X = snakePart.x + gridSize * 0.35; eye2Y = snakePart.y + gridSize * 0.75;
            } else if (dy > 0) { // Moving Down
                eye1X = snakePart.x + gridSize * 0.25; eye1Y = snakePart.y + gridSize * 0.65;
                eye2X = snakePart.x + gridSize * 0.75; eye1Y = snakePart.y + gridSize * 0.65;
            } else if (dy < 0) { // Moving Up
                eye1X = snakePart.x + gridSize * 0.25; eye1Y = snakePart.y + gridSize * 0.35;
                eye2X = snakePart.x + gridSize * 0.75; eye2Y = snakePart.y + gridSize * 0.35;
            } else { // Default or initial (facing right)
                eye1X = snakePart.x + gridSize * 0.65; eye1Y = snakePart.y + gridSize * 0.25;
                eye2X = snakePart.x + gridSize * 0.65; eye2Y = snakePart.y + gridSize * 0.75;
            }

            ctx.beginPath();
            ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
            ctx.fill();


        } else { // Body segments
            ctx.fillStyle = 'lime';
            ctx.strokeStyle = 'rgba(0,0,0,0)'; // Make body stroke transparent to reduce "line" effect
            
            const radius = gridSize / 4; // Rounded corners ka radius
            drawRoundedRect(ctx, snakePart.x, snakePart.y, gridSize, gridSize, radius);
            ctx.fill();
            ctx.stroke();
        }
    }

    function drawFood() {
        if (!ctx) { console.error("drawFood: Context is NULL."); return; } // Safety check
        ctx.fillStyle = 'red';
        ctx.strokeStyle = 'darkred';
        const radius = gridSize / 4; // Food ke liye bhi rounded corners
        drawRoundedRect(ctx, food.x, food.y, gridSize, gridSize, radius);
        ctx.fill();
        ctx.stroke();
    }

    function draw() {
        if (!ctx || !canvas) { console.error("draw: Context or Canvas is NULL."); return; } // Safety check
        try {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Canvas clear karo
            drawFood();
            snake.forEach(drawSnakePart);
        } catch (e) {
            console.error("Error drawing Snake game:", e);
            if (ctx) {
                ctx.fillStyle = 'blue';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }

    function advanceSnake() {
        if (!canvas) { console.error("advanceSnake: Canvas is NULL."); return; } // Safety check
        // Walls se takrane par game over ki bajaye wrap-around logic implement karo
        let headX = snake[0].x + dx;
        let headY = snake[0].y + dy;

        // Horizontal wrap-around
        if (headX < 0) {
            headX = canvas.width - gridSize;
        } else if (headX >= canvas.width) {
            headX = 0;
        }

        // Vertical wrap-around
        if (headY < 0) {
            headY = canvas.height - gridSize;
        } else if (headY >= canvas.height) {
            headY = 0;
        }

        const head = { x: headX, y: headY };

        // Self-collision check (ab bhi game over)
        if (checkSelfCollision(head)) {
            resetGame();
            return;
        }

        changingDirection = false; // Agle frame ke liye direction change ki anumati do

        snake.unshift(head); // Naya head add karo

        const didEatFood = head.x === food.x && food.y === food.y;
        if (didEatFood) {
            score += 10;
            createFood(); // Naya food generate karo
        } else {
            snake.pop(); // Agar food nahi khaya toh tail remove karo
        }
    }

    // Self-collision check ke liye alag function
    function checkSelfCollision(head) {
        for (let i = 1; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) return true;
        }
        return false;
    }

    function changeDirection(event) {
        if (changingDirection) return;
        changingDirection = true;

        const keyPressed = typeof event === 'string' ? event : event.key;

        const goingUp = dy === -gridSize;
        const goingDown = dy === gridSize;
        const goingLeft = dx === -gridSize;
        const goingRight = dx === gridSize;

        if (keyPressed === 'ArrowLeft' && !goingRight) {
            dx = -gridSize;
            dy = 0;
        }
        if (keyPressed === 'ArrowUp' && !goingDown) {
            dx = 0;
            dy = -gridSize;
        }
        if (keyPressed === 'ArrowRight' && !goingLeft) {
            dx = gridSize;
            dy = 0;
        }
        if (keyPressed === 'ArrowDown' && !goingUp) {
            dx = 0;
            dy = gridSize;
        }
    }

    function resetGame() {
        snake = [{ x: 10 * gridSize, y: 10 * gridSize }];
        dx = gridSize;
        dy = 0;
        score = 0;
        changingDirection = false;
        createFood();
        draw();
    }

    function mainGameLoop() {
        if (gameInterval) clearInterval(gameInterval);
        gameInterval = setTimeout(function onTick() {
            advanceSnake();
            draw();
            mainGameLoop();
        }, 150); // Game speed: 150ms (faster, smoother) - Adjusted for better animation
    }

    // Game Controls ke liye Event Listeners
    if (document.body) { // Check if body exists
        document.body.addEventListener('keydown', (e) => {
            if (!passwordSuccess && e.key.startsWith('Arrow')) {
                e.preventDefault();
                changeDirection(e.key);
            }
        });
    }

    if (gameUpBtn) { // Check if button exists before adding listener
        gameUpBtn.addEventListener('click', () => changeDirection('ArrowUp'));
    } else { console.error("Game Up Button not found."); }
    
    if (gameDownBtn) { // Check if button exists before adding listener
        gameDownBtn.addEventListener('click', () => changeDirection('ArrowDown'));
    } else { console.error("Game Down Button not found."); }

    if (gameLeftBtn) { // Check if button exists before adding listener
        gameLeftBtn.addEventListener('click', () => changeDirection('ArrowLeft'));
    } else { console.error("Game Left Button not found."); }
    
    if (gameRightBtn) { // Check if button exists before adding listener
        gameRightBtn.addEventListener('click', () => changeDirection('ArrowRight'));
    } else { console.error("Game Right Button not found."); }

    // Initial Snake game setup
    if (ctx) { // Only try to setup if context is valid
        resetGame();
        mainGameLoop();
    } else {
        console.error("Snake game cannot start: Context not available.");
    }


    // --- Password Input Logic ---
    if (joinButton) { // Check if element exists
        joinButton.addEventListener('click', () => {
            checkPassword();
        });
    } else { console.error("Join button not found."); }


    if (gameIdInput) { // Check if element exists
        gameIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
    } else { console.error("Game ID Input not found."); }


    function checkPassword() {
        const enteredPassword = gameIdInput.value.trim();
        if (enteredPassword === SECRET_TEXT_PASSWORD) {
            passwordSuccess = true;
            gameIdInput.style.borderColor = 'green';
            gameIdInput.disabled = true;
            joinButton.disabled = true;
            
            clearInterval(gameInterval); // Snake game roko

            setTimeout(() => {
                gameContainer.classList.remove('active');
                gameContainer.classList.add('hidden');
                chatContainer.classList.remove('hidden');
                chatContainer.classList.add('active');
                socket.emit('requestChatHistory', USER_ID);
                // Emit user online status when chat is opened
                socket.emit('userOnline', USER_ID); 
            }, 1000);
        } else {
            gameIdInput.style.borderColor = 'red';
            gameIdInput.value = '';
            gameIdInput.placeholder = 'Invalid ID. Try again!';
            setTimeout(() => {
                gameIdInput.style.borderColor = '#ccc';
                gameIdInput.placeholder = 'Create Game ID...';
            }, 1500);
        }
    }


    // --- Chat Logic ---

    // Function to render a single message bubble
    function renderMessage(msg, isSender = false) {
        if (!chatMessages) { console.error("renderMessage: chatMessages container not found."); return; } // Safety check
        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        bubble.classList.add(isSender ? 'sent' : 'received');
        bubble.dataset.messageId = msg._id;

        const contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');

        // Display reply quote if available
        if (msg.replyToMessageId) {
            const repliedToMsg = messages.find(m => m._id === msg.replyToMessageId);
            if (repliedToMsg) {
                const replyQuote = document.createElement('div');
                replyQuote.classList.add('reply-quote');
                replyQuote.textContent = `Replying to: "${repliedToMsg.content.substring(0, 30)}${repliedToMsg.content.length > 30 ? '...' : ''}"`;
                contentDiv.appendChild(replyQuote);
            }
        }
        
        // Display actual message content or "deleted" message
        if (msg.isDeleted) {
            bubble.classList.add('deleted');
            contentDiv.appendChild(document.createTextNode('This message was deleted.'));
        } else {
            contentDiv.appendChild(document.createTextNode(msg.content));
        }


        const timeSpan = document.createElement('span');
        timeSpan.classList.add('message-time');
        timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        bubble.appendChild(contentDiv);
        contentDiv.appendChild(timeSpan);

        // Add context menu for ANY message that is NOT deleted
        if (!msg.isDeleted) {
            bubble.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e, msg._id);
            });
            bubble.addEventListener('click', (e) => {
                if (e.target.closest('.message-bubble') === bubble && !activeContextMenu) {
                     showContextMenu(e, msg._id);
                }
            });
        }

        chatMessages.appendChild(bubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Context Menu Logic
    let activeContextMenu = null;

    // Function to dismiss the context menu
    function dismissContextMenu(e) {
        if (activeContextMenu) {
            const isClickInsideMenu = activeContextMenu.contains(e.target);
            const triggerBubble = document.querySelector(`[data-message-id="${activeContextMenu.dataset.messageId}"]`);
            const isClickOnTriggerBubble = triggerBubble && triggerBubble.contains(e.target);

            if (!isClickInsideMenu && !isClickOnTriggerBubble) {
                activeContextMenu.remove();
                activeContextMenu = null;
                document.body.removeEventListener('click', dismissContextMenu);
            }
        }
    }

    function showContextMenu(event, messageId) {
        if (activeContextMenu) {
            activeContextMenu.remove();
            activeContextMenu = null;
            document.body.removeEventListener('click', dismissContextMenu);
        }

        const contextMenu = document.createElement('div');
        contextMenu.classList.add('message-context-menu');
        contextMenu.dataset.messageId = messageId;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            console.log("Attempting to delete specific message for USER_ID:", USER_ID, "Message ID:", messageId);
            socket.emit('deleteMessage', messageId, USER_ID);
            contextMenu.remove();
            activeContextMenu = null;
            document.body.removeEventListener('click', dismissContextMenu);
        });

        const replyBtn = document.createElement('button');
        replyBtn.textContent = 'Reply';
        replyBtn.addEventListener('click', () => {
            setReplyContext(messageId);
            contextMenu.remove();
            activeContextMenu = null;
            document.body.removeEventListener('click', dismissContextMenu);
        });

        // Only allow delete button for messages sent by the current user (client-side restriction)
        const msgToModify = messages.find(m => m._id === messageId);
        if (msgToModify && msgToModify.senderId === USER_ID) {
            contextMenu.appendChild(deleteBtn);
        }
        
        contextMenu.appendChild(replyBtn);


        document.body.appendChild(contextMenu);

        contextMenu.style.display = 'block';
        const clickedBubbleRect = event.target.closest('.message-bubble').getBoundingClientRect();
        let menuLeft = clickedBubbleRect.right - contextMenu.offsetWidth;
        if (menuLeft < 0) menuLeft = 5;
        
        contextMenu.style.left = `${menuLeft}px`;
        contextMenu.style.top = `${clickedBubbleRect.top + window.scrollY}px`;

        activeContextMenu = contextMenu;

        document.body.addEventListener('click', dismissContextMenu);
    }

    function setReplyContext(messageId) {
        if (!messageInput || !replyInfo || !replyingToText) { console.error("setReplyContext: Required chat elements not found."); return; }
        messageInput.dataset.replyToMessageId = messageId;
        const originalMsg = messages.find(m => m._id === messageId);
        if (originalMsg) {
            replyingToText.textContent = `Replying to: "${originalMsg.content.substring(0, 30)}${originalMsg.content.length > 30 ? '...' : ''}"`;
        } else {
            replyingToText.textContent = `Replying to message ID: ${messageId}`;
        }
        replyInfo.classList.remove('hidden');
        messageInput.focus();
    }

    if (cancelReplyBtn) { // Check if element exists
        cancelReplyBtn.addEventListener('click', () => {
            delete messageInput.dataset.replyToMessageId;
            messageInput.placeholder = 'Type a message...';
            replyInfo.classList.add('hidden');
        });
    } else { console.error("Cancel Reply Button not found."); }


    if (sendButton) { // Check if element exists
        sendButton.addEventListener('click', () => {
            const content = messageInput.value.trim();
            if (content) {
                console.log("Client: Sending message:", content);
                const messageData = {
                    senderId: USER_ID,
                    content: content
                };
                if (messageInput.dataset.replyToMessageId) {
                    messageData.replyToMessageId = messageInput.dataset.replyToMessageId;
                    delete messageInput.dataset.replyToMessageId;
                    messageInput.placeholder = 'Type a message...';
                    replyInfo.classList.add('hidden');
                }
                socket.emit('sendMessage', messageData);
                messageInput.value = '';
                // Emit stopped typing after sending message
                if (isTyping) {
                    socket.emit('stoppedTyping', USER_ID);
                    isTyping = false;
                    clearTimeout(typingTimeout);
                }
            } else {
                console.log("Client: Message input is empty.");
            }
        });
    } else { console.error("Send Button not found."); }

    if (messageInput) { // Check if element exists
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (sendButton) sendButton.click(); // Call send button click if it exists
            } else {
                // Handle typing indicator
                if (!isTyping) {
                    socket.emit('typing', USER_ID);
                    isTyping = true;
                }
                clearTimeout(typingTimeout);
                typingTimeout = setTimeout(() => {
                    socket.emit('stoppedTyping', USER_ID);
                    isTyping = false;
                }, 3000); // Stop typing after 3 seconds of inactivity
            }
        });
    }


    // Existing Socket.on events for chat messages
    socket.on('chatHistory', (history) => {
        console.log("Client: Chat history received:", history);
        if (chatMessages) { // Safety check
            messages = history;
            chatMessages.innerHTML = '';
            messages.forEach(msg => {
                renderMessage(msg, msg.senderId === USER_ID);
            });
        }
    });

    socket.on('newMessage', (msg) => {
        console.log("Client: New message received:", msg);
        if (chatMessages) { // Safety check
            messages.push(msg);
            renderMessage(msg, msg.senderId === USER_ID);
        }
    });

    socket.on('messageUpdated', (updatedMsg) => {
        console.log("Client: Message updated received:", updatedMsg);
        if (chatMessages) { // Safety check
            const index = messages.findIndex(msg => msg._id === updatedMsg._id);
            if (index !== -1) {
                messages[index] = updatedMsg;
                const existingBubble = document.querySelector(`[data-message-id="${updatedMsg._id}"]`);
                if (existingBubble) {
                    const contentDiv = existingBubble.querySelector('.message-content');
                    if (updatedMsg.isDeleted) {
                        existingBubble.classList.add('deleted');
                        contentDiv.innerHTML = '';
                        contentDiv.appendChild(document.createTextNode('This message was deleted.'));
                        const clone = existingBubble.cloneNode(true);
                        existingBubble.parentNode.replaceChild(clone, existingBubble);
                    }
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                } else {
                     renderMessage(updatedMsg, updatedMsg.senderId === USER_ID);
                }
            }
        }
    });

    // Event listener for "Delete All My Messages" button
    if (deleteAllMyMessagesBtn) { // Check if button exists
        deleteAllMyMessagesBtn.addEventListener('click', () => {
            alert("Delete All My Messages Button Clicked!");
            console.log("Attempting to delete all messages for USER_ID:", USER_ID);
            if (confirm('Are you sure you want to delete the ENTIRE chat history for ALL users? This cannot be undone.')) {
                socket.emit('deleteAllMessagesGlobal');
            }
        });
    } else { console.error("Delete All My Messages Button not found."); }

    // --- Pull-to-refresh logic (from previous version, check needed) ---
    // Make sure chatMessages is defined before adding event listeners
    // Removed for now as user only requested status, and this was causing issues.
    // Re-add this logic if user requests pull-to-refresh again.


    // --- New: Socket.IO events for Typing and Online Status ---
    // Handle online user count updates
    socket.on('onlineUsersCount', (count) => {
        console.log(`Client: Online users count received: ${count}`);
        updateStatusIndicator(); // Update indicator based on received count
    });

    // Handle user coming online (broadcasted by server for others)
    socket.on('userOnline', (userId) => {
        if (userId && userId !== USER_ID) { // Only update for others, and if userId is not null/undefined
            onlineUsers[userId] = true;
            updateStatusIndicator();
        }
    });

    // Handle user going offline (broadcasted by server for others)
    socket.on('userOffline', (userId) => {
        if (userId && userId !== USER_ID) { // Only update for others
            delete onlineUsers[userId];
            delete typingUsers[userId]; // Also remove from typing users if they go offline
            updateStatusIndicator();
        }
    });

    // Handle typing status from other users
    socket.on('typing', (userId) => {
        if (userId && userId !== USER_ID) { // Only update for others
            typingUsers[userId] = true;
            updateStatusIndicator();
        }
    });

    socket.on('stoppedTyping', (userId) => {
        if (userId && typingUsers[userId]) { // Only update for others
            delete typingUsers[userId];
            updateStatusIndicator();
        }
    });

    // Function to update the status indicator display
    function updateStatusIndicator() {
        const otherOnlineUsersCount = Object.keys(onlineUsers).length;
        const otherTypingUsersCount = Object.keys(typingUsers).length;

        if (statusIndicator) { // Check if element exists
            if (otherTypingUsersCount > 0) {
                statusIndicator.textContent = 'Typing...';
                statusIndicator.style.color = '#aaffaa'; // Green for typing
            } else if (otherOnlineUsersCount > 0) {
                statusIndicator.textContent = 'Online';
                statusIndicator.style.color = '#aaffaa'; // Green for online
            } else {
                statusIndicator.textContent = 'Offline'; // Default to offline if no one else is online
                statusIndicator.style.color = '#c8e6c9'; // Slightly dimmed white
            }
        } else { console.error("Status Indicator element not found for update."); }
    }

    // New: Emit initial online status when client connects (after chat is shown)
    // This will now be emitted when chat becomes active, after password success.
    // socket.emit('userOnline', USER_ID); // Moved to checkPassword success function
}; // End of window.onload function
