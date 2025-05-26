// Check if user is admin and authorized
async function checkAdminAuth() {
    const auth_token = sessionStorage.getItem('auth_token');
    if (!auth_token) {
        window.location.href = '/login/index.html';
        return false;
    }

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
            sessionStorage.removeItem('auth_token');
            sessionStorage.removeItem('username');
            sessionStorage.removeItem('last_login');
            window.location.href = '/login/index.html';
            return false;
        }

        // Check if user is admin
        const adminResponse = await fetch(`${backendUrl}/admin/textlines`, {
            headers: {
                'Authorization': `Bearer ${auth_token}`
            }
        });

        if (!adminResponse.ok) {
            window.location.href = '/home/index.html';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login/index.html';
        return false;
    }
}

// Load all text lines
async function loadTextLines() {
    try {
        const auth_token = sessionStorage.getItem('auth_token');
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/admin/textlines`, {
            headers: {
                'Authorization': `Bearer ${auth_token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load text lines');
        }

        const data = await response.json();
        const textList = document.getElementById('text-list');
        textList.innerHTML = '';

        data.lines.forEach((line, index) => {
            const textItem = document.createElement('div');
            textItem.className = 'text-item';
            textItem.innerHTML = `
                <div class="text-content">${line}</div>
                <button class="delete-button" data-index="${index}">Delete</button>
            `;
            textList.appendChild(textItem);
        });

        // Add delete event listeners
        document.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', handleDelete);
        });
    } catch (error) {
        console.error('Error loading text lines:', error);
        alert('Failed to load text lines. Please try again.');
    }
}

// Handle adding new text
async function handleAddText() {
    const textInput = document.getElementById('new-text');
    const text = textInput.value.trim();

    if (!text) {
        alert('Please enter some text');
        return;
    }

    try {
        const auth_token = sessionStorage.getItem('auth_token');
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/admin/textlines`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${auth_token}`
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) {
            throw new Error('Failed to add text');
        }

        textInput.value = '';
        await loadTextLines();
    } catch (error) {
        console.error('Error adding text:', error);
        alert('Failed to add text. Please try again.');
    }
}

// Handle deleting text
async function handleDelete(event) {
    const index = event.target.dataset.index;
    
    try {
        const auth_token = sessionStorage.getItem('auth_token');
        const backendUrl = await window.config.getBackendUrl();
        const response = await fetch(`${backendUrl}/admin/textlines/${index}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${auth_token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete text');
        }

        await loadTextLines();
    } catch (error) {
        console.error('Error deleting text:', error);
        alert('Failed to delete text. Please try again.');
    }
}

// Initialize page
async function initializePage() {
    if (await checkAdminAuth()) {
        await loadTextLines();
        
        // Add event listeners
        document.getElementById('add-text').addEventListener('click', handleAddText);
    }
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);