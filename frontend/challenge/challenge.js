let currentText = '';
let startTime = null;
let isTyping = false;
let errorCount = 0;
let currentWordIndex = 0;
let wordsPerDisplay = 5;
let lastScrollPosition = 0;
let ws = null;
let isGameStarted = false;
let isGameFinished = false;

const textContent = document.getElementById('text-content');
const userInput = document.getElementById('user-input');
const speedDisplay = document.getElementById('speed');
const errorsDisplay = document.getElementById('errors');
const keyboard = document.getElementById('keyboard');
const opponentStatus = document.getElementById('opponent-status');
const playerProgress = document.getElementById('player-progress');
const opponentProgress = document.getElementById('opponent-progress');

// AZERTY keyboard layout (reused from practice.js)
const keyboardLayout = [
    ['²', '&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à', ')', '=', 'Backspace'],
    ['Tab', 'a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '^', '$'],
    ['Caps', 'q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'ù', '*', 'Enter'],
    ['Shift', '<', 'w', 'x', 'c', 'v', 'b', 'n', ',', ';', ':', '!', 'Shift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'AltGr', 'Menu', 'Ctrl']
];

// Initialize WebSocket connection
async function initializeWebSocket() {
    const backendUrl = await window.config.getBackendUrl();
    const auth_token = localStorage.getItem('auth_token');
    const wsUrl = backendUrl.replace('http', 'ws') + `/ws/challenge?auth_token=${auth_token}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        ws.send(JSON.stringify({
            type: 'join'
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        opponentStatus.textContent = 'Connection lost. Please refresh the page.';
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        opponentStatus.textContent = 'Connection error. Please refresh the page.';
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'opponent_joined':
            opponentStatus.textContent = 'Opponent joined! Get ready...';
            break;
        case 'game_start':
            isGameStarted = true;
            currentText = data.text;
            updateTextDisplay();
            opponentStatus.textContent = 'Game started! Type as fast as you can!';
            userInput.disabled = false;
            userInput.focus();
            break;
        case 'opponent_progress':
            updateOpponentProgress(data.progress);
            break;
        case 'game_over':
            handleGameOver(data);
            break;
        case 'opponent_left':
            opponentStatus.textContent = 'Opponent left the game';
            isGameFinished = true;
            userInput.disabled = true;
            break;
    }
}

function updatePlayerProgress(progress) {
    const percentage = Math.min(100, Math.round(progress * 100));
    playerProgress.style.width = `${percentage}%`;
}

function updateOpponentProgress(progress) {
    const percentage = Math.min(100, Math.round(progress * 100));
    opponentProgress.style.width = `${percentage}%`;
}

function handleGameOver(data) {
    isGameFinished = true;
    userInput.disabled = true;
    
    if (data.winner === localStorage.getItem('username')) {
        alert('Congratulations! You won the challenge!');
    } else {
        alert('Game Over! Your opponent finished first.');
    }
    
    // Redirect to home page after a short delay
    setTimeout(() => {
        window.location.href = '/home/index.html';
    }, 2000);
}

// Reused functions from practice.js
function createKeyboard() {
    keyboardLayout.forEach(row => {
        const rowElement = document.createElement('div');
        rowElement.className = 'keyboard-row';
        
        row.forEach(key => {
            const keyElement = document.createElement('div');
            keyElement.className = 'key';
            if (key === 'Space') keyElement.className += ' space';
            if (['Backspace', 'Tab', 'Caps', 'Enter', 'Shift', 'Ctrl', 'Win', 'Alt', 'AltGr', 'Menu'].includes(key)) {
                keyElement.className += ' special';
            }
            keyElement.textContent = key;
            keyElement.dataset.key = key.toLowerCase();
            rowElement.appendChild(keyElement);
        });
        
        keyboard.appendChild(rowElement);
    });
}

function highlightKey(key) {
    const keyElement = document.querySelector(`.key[data-key="${key.toLowerCase()}"]`);
    if (keyElement) {
        keyElement.classList.add('active');
        setTimeout(() => keyElement.classList.remove('active'), 100);
    }
}

function calculateWPM(timeInSeconds, textLength) {
    const words = textLength / 5;
    const minutes = timeInSeconds / 60;
    return Math.round(words / minutes);
}

function updateSpeed() {
    if (!startTime) return;
    const timeElapsed = (Date.now() - startTime) / 1000;
    const wpm = calculateWPM(timeElapsed, currentText.length);
    speedDisplay.textContent = wpm;
}

function updateTextColors(inputText) {
    const words = currentText.split(' ');
    const startIdx = currentWordIndex;
    const endIdx = Math.min(startIdx + wordsPerDisplay, words.length);
    const displayWords = words.slice(startIdx, endIdx);
    
    let currentPos = 0;
    textContent.innerHTML = displayWords.map(word => {
        const wordSpan = document.createElement('span');
        wordSpan.innerHTML = word.split('').map((char, charIndex) => {
            const isCorrect = currentPos + charIndex < inputText.length;
            return `<span class="${isCorrect ? 'correct' : ''}">${char}</span>`;
        }).join('');
        currentPos += word.length + 1;
        return wordSpan.outerHTML;
    }).join(' ');
}

function updateTextDisplay() {
    const words = currentText.split(' ');
    const startIdx = currentWordIndex;
    const endIdx = Math.min(startIdx + wordsPerDisplay, words.length);
    const displayWords = words.slice(startIdx, endIdx);
    textContent.innerHTML = displayWords.map(word => `<span>${word}</span>`).join(' ');
}

function flashError() {
    userInput.classList.add('error');
    setTimeout(() => userInput.classList.remove('error'), 200);
}

function getCurrentChunkText() {
    const words = currentText.split(' ');
    const startIdx = currentWordIndex;
    const endIdx = Math.min(startIdx + wordsPerDisplay, words.length);
    return words.slice(startIdx, endIdx).join(' ');
}

// Event Listeners
userInput.addEventListener('input', (e) => {
    if (!isGameStarted || isGameFinished) return;

    if (!isTyping) {
        isTyping = true;
        startTime = Date.now();
    }

    const inputText = e.target.value;
    const currentChunkText = getCurrentChunkText();
    
    // Check if current character is correct
    const expectedChar = currentChunkText[inputText.length - 1];
    const actualChar = inputText[inputText.length - 1];
    
    if (expectedChar !== actualChar) {
        userInput.value = inputText.slice(0, -1);
        flashError();
        errorCount++;
        errorsDisplay.textContent = errorCount;
        return;
    }

    updateTextColors(inputText);

    // Calculate and update progress
    const totalProgress = (currentWordIndex * wordsPerDisplay + inputText.length) / currentText.length;
    updatePlayerProgress(totalProgress);

    // Send progress to server
    ws.send(JSON.stringify({
        type: 'progress',
        progress: totalProgress
    }));

    // Check if we've completed all words
    if (currentWordIndex + wordsPerDisplay >= currentText.split(' ').length && 
        inputText === currentChunkText) {
        const timeElapsed = (Date.now() - startTime) / 1000;
        const wpm = calculateWPM(timeElapsed, currentText.length);
        
        // Send completion to server
        ws.send(JSON.stringify({
            type: 'complete',
            wpm: wpm,
            errors: errorCount
        }));
    }
    // Check if we've completed current chunk and should move to next
    else if (inputText === currentChunkText) {
        currentWordIndex += wordsPerDisplay;
        updateTextDisplay();
        userInput.value = '';
    }

    updateSpeed();
});

document.addEventListener('keydown', (e) => {
    highlightKey(e.key);
});

// Initialize
userInput.disabled = true;
createKeyboard();
initializeWebSocket(); 