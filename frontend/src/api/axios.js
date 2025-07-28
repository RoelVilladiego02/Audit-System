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

// Add a request interceptor to add the auth token to every request
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Enhanced request interceptor for CSRF and logging
instance.interceptors.request.use(
    async (config) => {
        // Get auth data
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        const authToken = localStorage.getItem('token');

        // Enhanced request logging
        console.log('Request Config:', {
            url: config.url,
            method: config.method,
            auth: {
                token: authToken ? 'Present' : 'Missing',
                user: user ? {
                    id: user.id,
                    email: user.email,
                    role: user.role
                } : null
            }
        });

        // Add Bearer token if available
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }

        // Skip CSRF cookie request for the csrf-cookie endpoint itself
        if (!config.url?.includes('sanctum/csrf-cookie')) {
            const csrfToken = getXsrfToken();
            if (!csrfToken) {
                try {
                    console.log('Fetching CSRF token...');
                    await axios.get('http://localhost:8000/sanctum/csrf-cookie', {
                        withCredentials: true
                    });
                    const newCsrfToken = getXsrfToken();
                    if (newCsrfToken) {
                        config.headers['X-XSRF-TOKEN'] = newCsrfToken;
                        console.log('New CSRF token set:', newCsrfToken);
                    }
                } catch (err) {
                    console.error('Failed to fetch CSRF token:', err);
                }
            } else {
                config.headers['X-XSRF-TOKEN'] = csrfToken;
                console.log('Using existing CSRF token:', csrfToken);
            }
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
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        console.error('API Error:', {
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
            message: error.message,
            auth: {
                token: localStorage.getItem('token') ? 'Present' : 'Missing',
                user: user ? {
                    id: user.id,
                    role: user.role,
                    email: user.email
                } : null
            }
        });

        if (error.response?.status === 419 && !error.config._retry) {
            error.config._retry = true;
            try {
                await axios.get('http://localhost:8000/sanctum/csrf-cookie', {
                    withCredentials: true
                });
                const csrfToken = getXsrfToken();
                if (csrfToken) {
                    error.config.headers['X-XSRF-TOKEN'] = csrfToken;
                    return axios(error.config);
                }
            } catch (retryError) {
                console.error('Failed to refresh CSRF token:', retryError);
                return Promise.reject(retryError);
            }
        }

        if (error.response?.status === 401 || error.response?.status === 403) {
            // Try to refresh user data first
            try {
                const authToken = localStorage.getItem('token');
                if (authToken) {
                    const userResponse = await axios.get('/api/user', {
                        headers: { Authorization: `Bearer ${authToken}` }
                    });
                    if (userResponse.data) {
                        localStorage.setItem('user', JSON.stringify(userResponse.data));
                        // Retry the original request
                        return axios(error.config);
                    }
                }
            } catch (refreshError) {
                console.error('Failed to refresh user data:', refreshError);
                // If refresh fails, clear auth and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default instance;
