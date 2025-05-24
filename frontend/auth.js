// Function to check if user is authorized
const checkAuth = async () => {
    const auth_token = localStorage.getItem('auth_token');
    
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
        
        // Show error message to user
        alert(error.message);
        
        // Redirect to login page
        window.location.href = '/login/index.html';
        return false;
    }
};

// Check auth status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth().catch(error => {
        console.error('Auth check failed:', error);
    });
});

// Export the checkAuth function for use in other scripts
window.checkAuth = checkAuth; 