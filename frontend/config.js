// Load configuration
let config = null;
let configLoaded = false;
let configLoadPromise = null;

// Function to load config
const loadConfig = async () => {
    if (configLoadPromise) {
        return configLoadPromise;
    }

    configLoadPromise = (async () => {
        try {
            const response = await fetch('../config.json');
            config = await response.json();
            configLoaded = true;
        } catch (error) {
            console.error('Failed to load configuration:', error);
            // Fallback to default values
            console.log('Failed to load configuration, using default values');
            config = {
                frontend: {
                    port: 8080,
                    protocol: 'http',
                    domain: 'localhost'
                },
                backend: {
                    port: 5000,
                    protocol: 'http',
                    domain: 'localhost'
                }
            };
            configLoaded = true;
        }
    })();

    return configLoadPromise;
};

// Function to get backend URL
const getBackendUrl = async () => {
    if (!configLoaded) {
        await loadConfig();
    }
    return `${config.backend.protocol}://${config.backend.domain}:${config.backend.port}`;
};

// Function to get frontend URL
const getFrontendUrl = async () => {
    if (!configLoaded) {
        await loadConfig();
    }
    return `${config.frontend.protocol}://${config.frontend.domain}:${config.frontend.port}`;
};

// Function to get full config
const getConfig = async () => {
    if (!configLoaded) {
        await loadConfig();
    }
    return config;
};

// Start loading config immediately
console.log("Loading config...");
loadConfig();

// Export functions and config
window.config = {
    getBackendUrl,
    getFrontendUrl,
    getConfig
}; 