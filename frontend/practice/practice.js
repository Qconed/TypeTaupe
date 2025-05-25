let currentLine = 0;
let startTime = null;
let currentText = '';
let isTyping = false;
let errorCount = 0;
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

async function fetchTextLine(lineNumber) {
    try {
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/get/textline/${lineNumber}`);
        if (!response.ok) throw new Error('Failed to fetch text line');
        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error fetching text line:', error);
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
    const textArray = currentText.split('');
    const inputArray = inputText.split('');
    
    textContent.innerHTML = textArray.map((char, index) => {
        const isCorrect = index < inputArray.length && char === inputArray[index];
        return `<span class="${isCorrect ? 'correct' : ''}">${char}</span>`;
    }).join('');
}

async function startNewPractice() {
    currentText = await fetchTextLine(currentLine);
    if (!currentText) {
        alert('Error loading text. Please try again.');
        return;
    }
    
    textContent.innerHTML = currentText.split('').map(char => `<span>${char}</span>`).join('');
    textContent.style.transform = 'translateX(0)';
    userInput.value = '';
    userInput.classList.remove('error');
    startTime = null;
    isTyping = false;
    errorCount = 0;
    errorsDisplay.textContent = '0';
    speedDisplay.textContent = '0';
    lastScrollPosition = 0;
}

userInput.addEventListener('input', (e) => {
    if (!isTyping) {
        isTyping = true;
        startTime = Date.now();
    }

    const inputText = e.target.value;
    
    // Check for errors
    const hasError = inputText.split('').some((char, index) => char !== currentText[index]);
    
    if (hasError) {
        errorCount++;
        errorsDisplay.textContent = errorCount;
        textContent.style.transform = `translateX(-${lastScrollPosition}px)`;
        userInput.classList.add('error');
    } else {
        updateTextColors(inputText);
        scrollText();
        userInput.classList.remove('error');
    }

    if (inputText === currentText) {
        const timeElapsed = (Date.now() - startTime) / 1000;
        const wpm = calculateWPM(timeElapsed, currentText.length);
        alert(`Congratulations! Your typing speed: ${wpm} WPM\nErrors: ${errorCount}`);
        currentLine++;
        startNewPractice();
    }

    updateSpeed();
});

// Add keyboard event listeners
document.addEventListener('keydown', (e) => {
    highlightKey(e.key);
});

// Initialize keyboard and start practice
createKeyboard();
startNewPractice(); 