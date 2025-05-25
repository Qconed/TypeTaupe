function loadHeader() {
    // First, load the CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = '../header/header.css';
    document.head.appendChild(linkElement);

    // Then load the header HTML
    fetch('../header/header.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const header = doc.querySelector('.header');
            document.getElementById('header-container').appendChild(header);

            // After the HTML is loaded, load the JavaScript
            const scriptElement = document.createElement('script');
            scriptElement.src = '../header/header.js';
            document.body.appendChild(scriptElement);
        })
        .catch(error => {
            console.error('Error loading header:', error);
        });
}

// Call the function when DOM is loaded
document.addEventListener('DOMContentLoaded', loadHeader); 