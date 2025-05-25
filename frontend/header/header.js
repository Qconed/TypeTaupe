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

// Function to handle website name click
function handleWebsiteNameClick() {
    window.location.href = '/home/index.html';
}

// Wait for the header to be loaded before adding the event listeners
function initializeHeader() {
    const logoutButton = document.getElementById('logout-button');
    const websiteName = document.querySelector('.website-name');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    
    if (websiteName) {
        websiteName.addEventListener('click', handleWebsiteNameClick);
        websiteName.style.cursor = 'pointer'; // Add pointer cursor to indicate clickability
    }
    
    // If elements aren't found, try again after a short delay
    if (!logoutButton || !websiteName) {
        setTimeout(initializeHeader, 100);
    }
}

// Start the initialization process
initializeHeader();