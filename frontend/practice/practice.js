let startTime = null;
let currentText = '';
let isTyping = false;
let errorCount = 0;
let currentWordIndex = 0;
let wordsPerDisplay = 5; // Number of words to show at once
let lastScrollPosition = 0;

const textContent = document.getElementById('text-content');
const userInput = document.getElementById('user-input');
const speedDisplay = document.getElementById('speed');
const errorsDisplay = document.getElementById('errors');
const keyboard = document.getElementById('keyboard');

// AZERTY keyboard layout
const keyboardLayout = [
    ['²', '&', 'é', '"', "'", '(', '-', 'è', '_', 'ç', 'à', ')', '=', 'Backspace'],
    ['Tab', 'a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '^', '$'],
    ['Caps', 'q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'ù', '*', 'Enter'],
    ['Shift', '<', 'w', 'x', 'c', 'v', 'b', 'n', ',', ';', ':', '!', 'Shift'],
    ['Ctrl', 'Win', 'Alt', 'Space', 'AltGr', 'Menu', 'Ctrl']
];

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

async function fetchRandomTextLine() {
    try {
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/get/random-textline`);
        if (!response.ok) throw new Error('Failed to fetch text line');
        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error fetching random text line:', error);
        return null;
    }
}

function calculateWPM(timeInSeconds, textLength) {
    const words = textLength / 5; // Average word length is 5 characters
    const minutes = timeInSeconds / 60;
    return Math.round(words / minutes);
}

function updateSpeed() {
    if (!startTime) return;
    const timeElapsed = (Date.now() - startTime) / 1000;
    const wpm = calculateWPM(timeElapsed, currentText.length);
    speedDisplay.textContent = wpm;
}

function scrollText() {
    const inputWidth = userInput.offsetWidth;
    const textWidth = textContent.offsetWidth;
    const scrollAmount = (textWidth - inputWidth) * (userInput.value.length / currentText.length) * 2;
    textContent.style.transform = `translateX(-${scrollAmount}px)`;
    lastScrollPosition = scrollAmount;
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
        currentPos += word.length + 1; // +1 for the space
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

async function startNewPractice() {
    currentText = await fetchRandomTextLine();
    if (!currentText) {
        alert('Error loading text. Please try again.');
        return;
    }
    
    currentWordIndex = 0;
    updateTextDisplay();
    userInput.value = '';
    startTime = null;
    isTyping = false;
    errorCount = 0;
    errorsDisplay.textContent = '0';
    speedDisplay.textContent = '0';
}

userInput.addEventListener('input', (e) => {
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
        // Revert to previous valid state
        userInput.value = inputText.slice(0, -1);
        flashError();
        errorCount++;
        errorsDisplay.textContent = errorCount;
        return;
    }

    // Update the colors of correctly typed characters
    updateTextColors(inputText);

    // Check if we've completed all words
    if (currentWordIndex + wordsPerDisplay >= currentText.split(' ').length && 
        inputText === currentChunkText) {
        const timeElapsed = (Date.now() - startTime) / 1000;
        const wpm = calculateWPM(timeElapsed, currentText.length);
        alert(`Congratulations! Your typing speed: ${wpm} WPM\nErrors: ${errorCount}`);
        startNewPractice();
    }
    // Check if we've completed current chunk and should move to next
    else if (inputText === currentChunkText) {
        currentWordIndex += wordsPerDisplay;
        updateTextDisplay();
        userInput.value = '';
    }

    updateSpeed();
});

// Add keyboard event listeners
document.addEventListener('keydown', (e) => {
    highlightKey(e.key);
});

// Initialize keyboard and start practice
async function initializePractice() {
    try {
        // Check if user is authorized
        const auth_token = localStorage.getItem('auth_token');
        if (!auth_token) {
            window.location.href = '/login/index.html';
            return;
        }

        // Verify token with backend
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ auth_token })
        });

        if (!response.ok) {
            // If token is invalid, redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('username');
            localStorage.removeItem('last_login');
            window.location.href = '/login/index.html';
            return;
        }

        // If we get here, token is valid - initialize the practice page
        createKeyboard();
        startNewPractice();
    } catch (error) {
        console.error('Error initializing practice page:', error);
        // On error, redirect to login to be safe
        window.location.href = '/login/index.html';
    }
}

// Start initialization
initializePractice();