async function handleLogout() {
    alert("logout");
    try {
        const auth_token = localStorage.getItem('auth_token');
        if (!auth_token) {
            console.error('No auth token found');
            return;
        }

        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ auth_token })
        });

        if (!response.ok) {
            throw new Error('Logout failed');
        }

        // Clear local storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');

        // Redirect to index page
        window.location.href = '/';
    } catch (error) {
        console.error('Error during logout:', error);
    }
}

// Wait for the header to be loaded before adding the event listener
function initializeLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    } else {
        // If the button isn't found, try again after a short delay
        setTimeout(initializeLogoutButton, 100);
    }
}

// Start the initialization process
initializeLogoutButton();