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
    } else {
        updateTextColors(inputText);
        scrollText();
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

// Start the first practice session
startNewPractice(); 