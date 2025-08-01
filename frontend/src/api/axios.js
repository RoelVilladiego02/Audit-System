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
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 10000, // 10 second timeout
    withCredentials: true // Important for handling cookies
});

// Add a request interceptor for error handling
instance.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Enhanced request interceptor for CSRF and logging
instance.interceptors.request.use(
    async (config) => {
        const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;
        const authToken = localStorage.getItem('token');

        // Log request details
        console.log('Request Config:', {
            url: config.url,
            method: config.method,
            headers: config.headers,
            data: config.data,
            auth: {
                token: authToken ? 'Present' : 'Missing',
                user: user ? {
                    id: user.id,
                    email: user.email,
                    role: user.role
                } : null
            }
        });

        // Set auth token if available
        if (authToken) {
            config.headers.Authorization = `Bearer ${authToken}`;
        }

        // Handle CSRF token
        if (!config.url?.includes('sanctum/csrf-cookie')) {
            const csrfToken = getXsrfToken();
            if (!csrfToken) {
                console.log('No CSRF token found, fetching new one...');
                try {
                    await axios.get('/sanctum/csrf-cookie', {
                        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
                        withCredentials: true
                    });
                    const newCsrfToken = getXsrfToken();
                    if (newCsrfToken) {
                        config.headers['X-XSRF-TOKEN'] = newCsrfToken;
                        console.log('New CSRF token obtained:', newCsrfToken);
                    } else {
                        console.error('Failed to obtain CSRF token');
                        throw new Error('Failed to obtain CSRF token');
                    }
                } catch (error) {
                    console.error('Error fetching CSRF token:', error);
                    throw error;
                }
            } else {
                config.headers['X-XSRF-TOKEN'] = csrfToken;
                console.log('Using existing CSRF token:', csrfToken);
            }
        }

        // Ensure PUT requests are properly formatted
        if (config.method?.toLowerCase() === 'put') {
            config.headers['X-HTTP-Method-Override'] = 'PUT';
            config.headers['Content-Type'] = 'application/json';
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
    (response) => {
        // Enhanced response logging
        console.log('Response Data:', {
            url: response.config.url,
            status: response.status,
            statusText: response.statusText,
            dataType: typeof response.data,
            data: response.data instanceof Blob ? 'Blob data' : response.data,
            headers: response.headers,
            timestamp: new Date().toISOString()
        });
        return response;
    },
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
                await axios.get('sanctum/csrf-cookie', {
                    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
                    withCredentials: true
                });
                const csrfToken = getXsrfToken();
                if (csrfToken) {
                    // Create exact copy of original request configuration
                    const retryConfig = {
                        ...error.config,
                        method: error.config.method, // Explicitly preserve the HTTP method
                        data: error.config.data, // Preserve request body/payload
                        params: error.config.params, // Preserve query parameters
                        headers: {
                            ...error.config.headers,
                            'X-XSRF-TOKEN': csrfToken
                        }
                    };
                    return instance(retryConfig);
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
                    const userResponse = await instance.get('user', {
                        headers: { Authorization: `Bearer ${authToken}` }
                    });
                    if (userResponse.data) {
                        localStorage.setItem('user', JSON.stringify(userResponse.data));
                        // Retry the original request with exact same configuration
                        const retryConfig = {
                            ...error.config,
                            method: error.config.method, // Explicitly preserve the HTTP method
                            data: error.config.data, // Preserve request body/payload
                            params: error.config.params, // Preserve query parameters
                            headers: {
                                ...error.config.headers,
                                Authorization: `Bearer ${authToken}`
                            }
                        };
                        return instance(retryConfig);
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

// Add specific methods for review operations before the export
instance.reviewAnswer = async (submissionId, answerId, reviewData) => {
    const url = `/audit-submissions/${submissionId}/answers/${answerId}/review`;
    console.log('Sending review request:', {
        url,
        method: 'PUT',
        data: reviewData
    });
    
    try {
        const response = await instance({
            url,
            method: 'PUT', // Explicitly set method as PUT
            data: reviewData,
            headers: {
                'Content-Type': 'application/json',
                'X-HTTP-Method-Override': 'PUT' // Add this for extra safety
            }
        });
        return response.data;
    } catch (error) {
        console.error('Review request failed:', {
            error: error.response?.data || error.message,
            status: error.response?.status,
            config: error.config
        });
        throw error;
    }
};

export default instance;