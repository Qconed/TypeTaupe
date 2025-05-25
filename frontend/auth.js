// Function to check if user is authorized
const checkAuth = async () => {
    const auth_token = localStorage.getItem('auth_token');
    const last_login = localStorage.getItem('last_login');
    
    try {
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ auth_token })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Unauthorized');
        }

        return true;
    } catch (error) {
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        localStorage.removeItem('last_login');
        
        // Show error message to user
        alert(error.message);
        
        // Redirect to login page
        window.location.href = '/login/index.html';
        return false;
    }
};

// Function to handle login
const handleLogin = async (username, password) => {
    try {
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store auth token and last login timestamp
        localStorage.setItem('auth_token', data.auth_token);
        localStorage.setItem('username', username);
        localStorage.setItem('last_login', data.last_login);

        // Redirect to game page
        window.location.href = '/game/index.html';
    } catch (error) {
        alert(error.message);
    }
};

// Function to handle logout
window.handleLogout = async () => {
    try {
        const auth_token = localStorage.getItem('auth_token');
        console.log("Attempting logout with token:", auth_token ? "present" : "missing");

        if (auth_token) {
            const backendUrl = await window.config.getBackendUrl();
            const response = await fetch(`${backendUrl}/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ auth_token })
            });

            const data = await response.json();
            console.log("Logout response:", data);

            if (!response.ok) {
                throw new Error(data.error || 'Logout failed');
            }
        }
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error during logout: ' + error.message);
    } finally {
        // Clear all auth data
        console.log("Clearing auth data from localStorage");
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        localStorage.removeItem('last_login');
        
        // Redirect to login page
        window.location.href = '/login/index.html';
    }
};

// Check auth status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth().catch(error => {
        console.error('Auth check failed:', error);
    });
});

// Export functions for use in other scripts
window.checkAuth = checkAuth;
window.handleLogin = handleLogin; 