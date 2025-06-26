// --- Game Variables (Real Snake Game) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const chatContainer = document.getElementById('chat-container');

const gameUpBtn = document.getElementById('game-up-btn');
const gameDownBtn = document.getElementById('game-down-btn');
const gameLeftBtn = document.getElementById('game-left-btn');
const gameRightBtn = document.getElementById('game-right-btn');

const gridSize = 40; // HD quality ke liye (double size)
let snake = [{ x: 10 * gridSize, y: 10 * gridSize }]; // Snake centre se shuru hota hai
let food = {};
let dx = gridSize; // Shuruati direction: right
let dy = 0;
let score = 0;
let changingDirection = false; // Tezi se direction change rokne ke liye
let gameInterval; // Game speed control ke liye

// --- Password Input Variables ---
const gameIdInput = document.getElementById('game-id-input');
const joinButton = document.getElementById('join-btn');
const SECRET_TEXT_PASSWORD = "4407"; // <-- Apna secret password yahan set karo!

// --- Chat Variables ---
const socket = io(); // Socket.IO server se connect
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-btn');
const replyInfo = document.getElementById('reply-info');
const replyingToText = document.getElementById('replying-to-text');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');
const deleteAllMyMessagesBtn = document.getElementById('delete-all-my-messages-btn');


let USER_ID = localStorage.getItem('secret_chat_user_id');
if (!USER_ID) {
    USER_ID = uuid.v4(); // Naya UUID generate karo
    localStorage.setItem('secret_chat_user_id', USER_ID);
}

let messages = []; // Sabhi messages ko hold karne ke liye array (reply logic ke liye)

// --- Helper function to draw a rounded rectangle (snake segments ke liye) ---
function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
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
    food = {
        x: Math.floor(Math.random() * (canvas.width / gridSize)) * gridSize,
        y: Math.floor(Math.random() * (canvas.height / gridSize)) * gridSize
    };

    // Confirm karo ki food snake par spawn na ho
    for (let i = 0; i < snake.length; i++) {
        if (food.x === snake[i].x && food.y === snake[i].y) {
            createFood(); // Agar snake par hai toh phir se create karo
            return;
        }
    }
}

function drawSnakePart(snakePart, index) { // index parameter add kiya gaya
    // Snake ka head thoda alag color/style ka hoga
    if (index === 0) { // Yeh snake ka head hai
        ctx.fillStyle = '#6EEB83'; // Head ke liye chamkeela hara
        ctx.strokeStyle = '#27ae60';
    } else { // Body segments
        ctx.fillStyle = 'lime';
        ctx.strokeStyle = 'darkgreen';
    }
    
    const radius = gridSize / 4; // Rounded corners ka radius
    drawRoundedRect(ctx, snakePart.x, snakePart.y, gridSize, gridSize, radius);
    ctx.fill();
    ctx.stroke();
}

function drawFood() {
    ctx.fillStyle = 'red';
    ctx.strokeStyle = 'darkred';
    const radius = gridSize / 4; // Food ke liye bhi rounded corners
    drawRoundedRect(ctx, food.x, food.y, gridSize, gridSize, radius);
    ctx.fill();
    ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Canvas clear karo
    drawFood();
    snake.forEach(drawSnakePart); // Ab index pass hota hai
}

function advanceSnake() {
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
        resetGame(); // Game over hone par reset karo
        return;
    }

    changingDirection = false; // Agle frame ke liye direction change ki anumati do

    snake.unshift(head); // Naya head add karo

    const didEatFood = head.x === food.x && head.y === food.y;
    if (didEatFood) {
        score += 10;
        createFood(); // Naya food generate karo
    } else {
        snake.pop(); // Agar food nahi khaya toh tail remove karo
    }
}

// Self-collision check ke liye alag function
function checkSelfCollision(head) {
    for (let i = 1; i < snake.length; i++) { // Head ko apne aap se check karne se bachne ke liye 1 se shuru karo
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    return false;
}

function changeDirection(event) {
    if (changingDirection) return;
    changingDirection = true;

    // Keyboard input ke liye event.key ka upyog karo, aur button clicks ke liye special "button-press" strings ka upyog karo
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
    snake = [{ x: 10 * gridSize, y: 10 * gridSize }]; // Centre par reset karo
    dx = gridSize; // Default to right
    dy = 0;
    score = 0;
    changingDirection = false;
    createFood();
    draw(); // Initial state ko phir se draw karo
    // console.log('Game Over! Score: ' + score); // Debugging ke liye
}

function mainGameLoop() {
    gameInterval = setTimeout(function onTick() {
        advanceSnake();
        draw();
        mainGameLoop();
    }, 200); // Game speed: 200ms (zyada value matlab dheemi speed) - Is value ko adjust karo!
}

// Game Controls ke liye Event Listeners
document.addEventListener('keydown', (e) => {
    // Sirf chat mode mein na hone par aur direction change mein busy na hone par game controls ki anumati do
    if (!passwordSuccess && e.key.startsWith('Arrow')) {
        e.preventDefault(); // Default arrow key scrolling roko
        changeDirection(e.key);
    }
});

gameUpBtn.addEventListener('click', () => changeDirection('ArrowUp'));
gameDownBtn.addEventListener('click', () => changeDirection('ArrowDown'));
gameLeftBtn.addEventListener('click', () => changeDirection('ArrowLeft'));
gameRightBtn.addEventListener('click', () => changeDirection('ArrowRight'));

// Game ko initialize karo
createFood();
mainGameLoop();

// --- Password Input Logic (Game ID ke liye) ---
joinButton.addEventListener('click', () => {
    checkPassword();
});

gameIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        checkPassword();
    }
});

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
            socket.emit('requestChatHistory', USER_ID); // Chat history request karo
            messageInput.focus();
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

// Single message bubble render karne ka function
function renderMessage(msg, isSender = false) {
    const bubble = document.createElement('div');
    bubble.classList.add('message-bubble');
    bubble.classList.add(isSender ? 'sent' : 'received');
    bubble.dataset.messageId = msg._id; // Reply/delete ke liye message ID store karo

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('message-content');

    // Agar reply quote available hai toh display karo
    if (msg.replyToMessageId) {
        const repliedToMsg = messages.find(m => m._id === msg.replyToMessageId);
        if (repliedToMsg) {
            const replyQuote = document.createElement('div');
            replyQuote.classList.add('reply-quote');
            // Reply kiye gaye message ka content dikhao, agar lamba hai toh truncate karo
            replyQuote.textContent = `Replying to: "${repliedToMsg.content.substring(0, 30)}${repliedToMsg.content.length > 30 ? '...' : ''}"`;
            contentDiv.appendChild(replyQuote);
        }
    }
    
    // Actual message content ya "deleted" message display karo
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

    // Delete na kiye gaye kisi bhi message ke liye context menu add karo
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
let activeContextMenu = null; // Currently open context menu ko track karta hai

// Context menu ko dismiss karne ka function
function dismissContextMenu(e) {
    if (activeContextMenu) {
        // Check karo ki click kiya gaya element active context menu ke andar hai ya nahi
        const isClickInsideMenu = activeContextMenu.contains(e.target);
        // Ya click kiya gaya element woh message bubble hai jisne context menu ko trigger kiya tha
        // `activeContextMenu.dataset.messageId` se us trigger bubble ko locate karte hain
        const triggerBubble = document.querySelector(`[data-message-id="${activeContextMenu.dataset.messageId}"]`);
        const isClickOnTriggerBubble = triggerBubble && triggerBubble.contains(e.target);

        // Agar click menu ke andar nahi hai AUR trigger bubble par bhi nahi hai, toh dismiss karo
        if (!isClickInsideMenu && !isClickOnTriggerBubble) {
            activeContextMenu.remove(); // Menu ko DOM se hatao
            activeContextMenu = null; // Reference clear karo
            // Is listener ko hata do takib yeh unnecessary na chale dismissal ke baad
            document.body.removeEventListener('click', dismissContextMenu);
        }
    }
}

function showContextMenu(event, messageId) {
    // Agar koi dusra context menu pehle se khula hai, toh use pehle hata do
    if (activeContextMenu) {
        activeContextMenu.remove();
        activeContextMenu = null;
        document.body.removeEventListener('click', dismissContextMenu); // Purane listener ko hata do
    }

    const contextMenu = document.createElement('div');
    contextMenu.classList.add('message-context-menu');
    contextMenu.dataset.messageId = messageId;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
        // Debugging: Event emit karne se pehle USER_ID ko log karo
        console.log("Attempting to delete specific message for USER_ID:", USER_ID, "Message ID:", messageId);
        // Verification ke liye USER_ID ko server par bhi bhejo
        socket.emit('deleteMessage', messageId, USER_ID);
        contextMenu.remove();
        activeContextMenu = null;
        document.body.removeEventListener('click', dismissContextMenu); // Menu click par bhi listener hata do
    });

    const replyBtn = document.createElement('button');
    replyBtn.textContent = 'Reply';
    replyBtn.addEventListener('click', () => {
        setReplyContext(messageId); // Reply context set karne ke liye helper function call karo
        contextMenu.remove();
        activeContextMenu = null;
        document.body.removeEventListener('click', dismissContextMenu); // Menu click par bhi listener hata do
    });

    // Sirf current user dwara bheje gaye messages ke liye delete button dikhao (client-side restriction)
    const msgToModify = messages.find(m => m._id === messageId);
    if (msgToModify && msgToModify.senderId === USER_ID) {
        contextMenu.appendChild(deleteBtn);
    }
    
    contextMenu.appendChild(replyBtn);


    document.body.appendChild(contextMenu);

    contextMenu.style.display = 'block';
    const clickedBubbleRect = event.target.closest('.message-bubble').getBoundingClientRect();
    // Menu ko bubble ke right mein position karo, choti screen ke liye adjust karo
    let menuLeft = clickedBubbleRect.right - contextMenu.offsetWidth;
    if (menuLeft < 0) menuLeft = 5; // Menu ko screen ke left se bahar jane se roko
    
    contextMenu.style.left = `${menuLeft}px`;
    contextMenu.style.top = `${clickedBubbleRect.top + window.scrollY}px`;

    activeContextMenu = contextMenu; // Naye khule menu ka reference store karo

    // Global click listener add karo menu ko dismiss karne ke liye
    document.body.addEventListener('click', dismissContextMenu);
}

// Helper function reply context set karne ke liye
function setReplyContext(messageId) {
    messageInput.dataset.replyToMessageId = messageId;
    const originalMsg = messages.find(m => m._id === messageId);
    if (originalMsg) {
        replyingToText.textContent = `Replying to: "${originalMsg.content.substring(0, 30)}${originalMsg.content.length > 30 ? '...' : ''}"`;
    } else {
        replyingToText.textContent = `Replying to message ID: ${messageId}`;
    }
    replyInfo.classList.remove('hidden'); // Reply info bar dikhao
    messageInput.focus();
}

// Cancel Reply button ka listener
cancelReplyBtn.addEventListener('click', () => {
    delete messageInput.dataset.replyToMessageId; // Reply context clear karo
    messageInput.placeholder = 'Type a message...';
    replyInfo.classList.add('hidden'); // Reply info bar chhupao
});


sendButton.addEventListener('click', () => {
    const content = messageInput.value.trim();
    if (content) {
        const messageData = {
            senderId: USER_ID,
            content: content
        };
        if (messageInput.dataset.replyToMessageId) {
            messageData.replyToMessageId = messageInput.dataset.replyToMessageId;
            delete messageInput.dataset.replyToMessageId; // Reply context clear karo
            messageInput.placeholder = 'Type a message...';
            replyInfo.classList.add('hidden'); // Reply info bar chhupao
        }
        socket.emit('sendMessage', messageData);
        messageInput.value = '';
    }
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendButton.click();
    }
});

socket.on('chatHistory', (history) => {
    messages = history;
    chatMessages.innerHTML = '';
    messages.forEach(msg => {
        renderMessage(msg, msg.senderId === USER_ID);
    });
});

socket.on('newMessage', (msg) => {
    messages.push(msg);
    renderMessage(msg, msg.senderId === USER_ID);
});

socket.on('messageUpdated', (updatedMsg) => {
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
                // Listeners ko remove aur sahi se update karne ke liye, poore element ko replace karo
                const clone = existingBubble.cloneNode(true);
                existingBubble.parentNode.replaceChild(clone, existingBubble);
            }
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
             renderMessage(updatedMsg, updatedMsg.senderId === USER_ID);
        }
    }
});

// "Delete All My Messages" button ka listener
deleteAllMyMessagesBtn.addEventListener('click', () => {
    alert("Delete All My Messages Button Clicked!"); // <-- Debugging line
    console.log("Attempting to delete all messages for USER_ID:", USER_ID); // <-- Debugging line
    if (confirm('Are you sure you want to delete the ENTIRE chat history for ALL users? This cannot be undone.')) {
        socket.emit('deleteAllMessagesGlobal'); // <-- Event name change kiya gaya hai
    }
});
                                                                                             
