// Get DOM elements
const loginButton = document.getElementById('login-submit');
const registerButton = document.getElementById('register-submit');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// API endpoint
const API_URL = 'http://localhost:5000';

// Function to handle API responses
const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
    }
    return data;
};

// Login function
const handleLogin = async () => {
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value
            })
        });

        const data = await handleResponse(response);
        
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', usernameInput.value);
        
        // Redirect to home page
        window.location.href = '/home/index.html';
    } catch (error) {
        alert(error.message);
    }
};

// Register function
const handleRegister = async () => {
    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value
            })
        });

        const data = await handleResponse(response);
        
        // If registration is successful, automatically log in
        await handleLogin();
    } catch (error) {
        alert(error.message);
    }
};

// Add event listeners
loginButton.addEventListener('click', handleLogin);
registerButton.addEventListener('click', handleRegister);
