// Function to check if user is authorized
const checkAuth = async () => {
    const auth_token = localStorage.getItem('auth_token');
    
    try {
        const response = await fetch('http://localhost:5000/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ auth_token })
        });

        if (!response.ok) {
            throw new Error('Unauthorized');
        }

        return true;
    } catch (error) {
        // Clear invalid token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');     
        alert('Unauthorized token, redirecting...');   
        
        // Redirect to login page
        window.location.href = '/login/index.html';
        return false;
    }
};

// Check auth status on page load
document.addEventListener('DOMContentLoaded', checkAuth);

// Export the checkAuth function for use in other scripts
window.checkAuth = checkAuth; 