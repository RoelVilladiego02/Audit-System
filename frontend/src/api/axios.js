import axios from 'axios';

// Function to get CSRF token
const getXsrfToken = () => {
    const tokenCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='));
    if (tokenCookie) {
        return decodeURIComponent(tokenCookie.split('=')[1]);
    }
    return null;
};

const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 10000, // 10 second timeout
    withCredentials: true // Important for handling cookies
});

// Request interceptor
instance.interceptors.request.use(
    async (config) => {
        console.log('Request Config:', {
            url: config.url,
            headers: config.headers,
            method: config.method
        });

        // Add Bearer token if available
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Skip CSRF cookie request for the csrf-cookie endpoint itself
        if (!config.url?.includes('sanctum/csrf-cookie')) {
            const token = getXsrfToken();
            if (!token) {
                try {
                    console.log('Fetching CSRF token...');
                    await axios.get('http://localhost:8000/sanctum/csrf-cookie', {
                        withCredentials: true
                    });
                    // Set the CSRF token after getting it
                    const newToken = getXsrfToken();
                    if (newToken) {
                        config.headers['X-XSRF-TOKEN'] = newToken;
                        console.log('New CSRF token set:', newToken);
                    }
                } catch (err) {
                    console.error('Failed to fetch CSRF token:', err);
                }
            } else {
                config.headers['X-XSRF-TOKEN'] = token;
                console.log('Using existing CSRF token:', token);
            }
        }

        // Add auth token if available
        const authToken = localStorage.getItem('token');
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }

        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Log the error details
        console.error('API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
            message: error.message
        });

        // Only try to refresh CSRF token once to prevent infinite loops
        if (error.response?.status === 419 && !error.config._retry) {
            error.config._retry = true;
            try {
                await axios.get('http://localhost:8000/sanctum/csrf-cookie', {
                    withCredentials: true
                });
                const token = getXsrfToken();
                if (token) {
                    error.config.headers['X-XSRF-TOKEN'] = token;
                    // Retry the original request with the new token
                    return axios(error.config);
                }
            } catch (retryError) {
                console.error('Failed to refresh CSRF token:', retryError);
                return Promise.reject(retryError);
            }
        }

        // Handle unauthorized
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default instance;
