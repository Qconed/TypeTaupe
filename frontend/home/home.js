// Maximum number of users to display in the list
const MAX_DISPLAYED_USERS = 20;

/**
 * Displays the welcome message with username
 */
function displayWelcomeMessage() {
    const username = sessionStorage.getItem('username');
    console.log('Username from sessionStorage:', username);
    if (username) {
        const welcomeContainer = document.createElement('h2');
        welcomeContainer.id = 'welcome-username';
        welcomeContainer.textContent = `Hello, ${username}!`;
        welcomeContainer.style.textAlign = 'center';
        welcomeContainer.style.margin = '0 0 2rem 0';
        welcomeContainer.style.color = '#4285f4';
        welcomeContainer.style.fontWeight = '500';
        welcomeContainer.style.fontSize = '1.8rem';
        welcomeContainer.style.fontStyle = 'italic';
        welcomeContainer.style.textShadow = '0 1px 2px rgba(0,0,0,0.2)';
        
        // Insert after the h1 element
        const h1Element = document.querySelector('h1');
        if (h1Element && h1Element.parentNode) {
            if (h1Element.nextSibling) {
                h1Element.parentNode.insertBefore(welcomeContainer, h1Element.nextSibling);
            } else {
                h1Element.parentNode.appendChild(welcomeContainer);
            }
        }
    } else {
        console.error('No username found in sessionStorage');
    }
}

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
            console.error('Connected users container element not found');
            return;
        }
        
        // Clear previous content
        container.innerHTML = '';
        
        // Display total number of users
        const totalUsersElement = document.createElement('p');
        totalUsersElement.textContent = `Currently online: ${totalUsers}`;
        container.appendChild(totalUsersElement);
        
        // Display list of users (limited to maxUsers)
        if (users.length > 0) {
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
        } else {
            const noUsersElement = document.createElement('p');
            noUsersElement.textContent = 'No users currently online';
            container.appendChild(noUsersElement);
        }
    } catch (error) {
        console.error('Error fetching connected users:', error);
        
        // Show error message in the container
        const container = document.getElementById('connected-users-container');
        if (container) {
            container.innerHTML = '<p>Failed to load connected users</p>';
        }
    }
}

// Check if user is admin
async function checkIfAdmin() {
    const auth_token = sessionStorage.getItem('auth_token');
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
        // adminLink.textContent = 'Manage Practice Text';
        
        // Add the link to the appropriate container
        const container = document.querySelector('.main-content');
        if (container) {
            container.appendChild(adminLink);
        }
    }
}

// Initialize page
async function initializePage() {
    try {
        // First check if authenticated
        await window.checkAuth();
        console.log('Authentication check passed');
        
        // Initialize user interface elements
        displayWelcomeMessage();
        await displayConnectedUsers();
        await addAdminFeatures();
        
        // Set up interval for updating connected users
        setInterval(() => {
            displayConnectedUsers();
        }, 5000); // Update every 5 seconds
        
        console.log('Home page initialized successfully');
    } catch (error) {
        console.error('Error initializing page:', error);
    }
}

// Make sure DOM is loaded before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    // DOM already loaded, initialize directly
    initializePage();
}