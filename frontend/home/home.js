// Maximum number of users to display in the list
const MAX_DISPLAYED_USERS = 20;

/**
 * Fetches and displays the list of currently connected users
 * @param {number} maxUsers - Maximum number of users to display in the list (default: MAX_DISPLAYED_USERS)
 */
async function displayConnectedUsers(maxUsers = MAX_DISPLAYED_USERS) {
    try {
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/get/connected-users`);
        if (!response.ok) {
            throw new Error('Failed to fetch connected users');
        }
        
        const data = await response.json();
        const users = data.users || [];
        const totalUsers = users.length;
        
        // Get the container element where we'll display the users
        const container = document.getElementById('connected-users-container');
        if (!container) {
            console.error('Container element not found');
            return;
        }
        
        // Clear previous content
        container.innerHTML = '';
        
        // Display total number of users
        const totalUsersElement = document.createElement('p');
        totalUsersElement.textContent = `Currrently online: ${totalUsers}`;
        container.appendChild(totalUsersElement);
        
        // Display list of users (limited to maxUsers)
        const userList = document.createElement('ul');
        users.slice(0, maxUsers).forEach(user => {
            const listItem = document.createElement('li');
            listItem.textContent = user.name;
            userList.appendChild(listItem);
        });
        
        container.appendChild(userList);
        
        // If there are more users than the display limit, show a message
        if (totalUsers > maxUsers) {
            const remainingUsers = document.createElement('p');
            remainingUsers.textContent = `... and ${totalUsers - maxUsers} more`;
            container.appendChild(remainingUsers);
        }
    } catch (error) {
        console.error('Error fetching connected users:', error);
    }
}

// Call the function when the page loads and then every X seconds
document.addEventListener('DOMContentLoaded', () => {
    // Initial call
    displayConnectedUsers();
    
    // Set up interval for subsequent calls
    setInterval(() => {
        displayConnectedUsers();
    }, 2000); // in milliseconds
});

// Check if user is admin
async function checkIfAdmin() {
    const auth_token = localStorage.getItem('auth_token');
    if (!auth_token) return false;

    try {
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/admin/textlines`, {
            headers: {
                'Authorization': `Bearer ${auth_token}`
            }
        });

        return response.ok;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Add admin features to the page
async function addAdminFeatures() {
    const isAdmin = await checkIfAdmin();
    if (isAdmin) {
        const adminLink = document.createElement('a');
        adminLink.href = '/addtext/index.html';
        adminLink.className = 'admin-link';
        adminLink.textContent = 'Manage Practice Text';
        
        // Add the link to the appropriate container
        const container = document.querySelector('.container');
        if (container) {
            container.appendChild(adminLink);
        }
    }
}

// Initialize page
async function initializePage() {
    await checkAuth();
    await addAdminFeatures();
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage); 