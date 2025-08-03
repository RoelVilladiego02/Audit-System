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

// Selective cookie cleanup - only remove problematic cookies, keep essential ones
const cleanupUnnecessaryCookies = () => {
    const cookies = document.cookie.split(';');
    const keepCookies = ['XSRF-TOKEN', 'laravel_session', 'laravel_token'];
    
    cookies.forEach(cookie => {
        const [name] = cookie.split('=');
        const cookieName = name.trim();
        
        // Only remove cookies that aren't essential for Laravel Sanctum
        if (!keepCookies.includes(cookieName) && cookieName !== '') {
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
    });
};

// Clean up unnecessary cookies on initialization
cleanupUnnecessaryCookies();

const instance = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 30000,
    withCredentials: true,
});

// Single request interceptor to handle all authentication and CSRF
instance.interceptors.request.use(
    async (config) => {
        // Clean up unnecessary cookies before each request
        cleanupUnnecessaryCookies();

        // Get auth token
        const token = localStorage.getItem('token');
        
        // Set base headers
        config.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };

        // Handle CSRF token for state-changing operations
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
            let csrfToken = getXsrfToken();
            
            // If no CSRF token, fetch one
            if (!csrfToken && !config.url?.includes('sanctum/csrf-cookie')) {
                try {
                    await axios.get('/sanctum/csrf-cookie', {
                        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
                        withCredentials: true,
                        headers: {
                            'Accept': 'application/json'
                        }
                    });
                    csrfToken = getXsrfToken();
                } catch (error) {
                    console.error('CSRF token fetch failed:', error);
                }
            }
            
            if (csrfToken) {
                config.headers['X-XSRF-TOKEN'] = csrfToken;
            }
        }

        // Add method override for PUT requests
        if (config.method?.toLowerCase() === 'put') {
            config.headers['X-HTTP-Method-Override'] = 'PUT';
        }

        // Log header size for debugging
        const headerSize = JSON.stringify(config.headers).length;
        const cookieSize = document.cookie.length;
        console.log(`Request to ${config.url}: Headers=${headerSize}b, Cookies=${cookieSize}b, Total≈${headerSize + cookieSize}b`);

        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Single response interceptor
instance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Handle CSRF token expiry (419)
        if (error.response?.status === 419 && !originalRequest._csrfRetry) {
            originalRequest._csrfRetry = true;
            
            try {
                // Fetch new CSRF token
                await axios.get('/sanctum/csrf-cookie', {
                    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
                    withCredentials: true,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                const newCsrfToken = getXsrfToken();
                if (newCsrfToken) {
                    originalRequest.headers['X-XSRF-TOKEN'] = newCsrfToken;
                    return instance(originalRequest);
                }
            } catch (retryError) {
                console.error('CSRF retry failed:', retryError);
            }
        }

        // Handle authentication errors (401, 403)
        if ([401, 403].includes(error.response?.status) && !originalRequest._authRetry) {
            originalRequest._authRetry = true;
            
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // Try to refresh user data
                    const userResponse = await instance.get('/user', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (userResponse.data) {
                        localStorage.setItem('user', JSON.stringify(userResponse.data));
                        return instance(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('Auth refresh failed:', refreshError);
                    // Clear auth data and redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
            } else {
                // No token, redirect to login
                window.location.href = '/login';
            }
        }

        // Handle 431 errors by cleaning cookies and retrying once
        if (error.response?.status === 431 && !originalRequest._headerRetry) {
            originalRequest._headerRetry = true;
            console.warn('431 Request Header Fields Too Large - cleaning cookies and retrying');
            
            // More aggressive cookie cleanup
            document.cookie.split(';').forEach(cookie => {
                const [name] = cookie.split('=');
                const cookieName = name.trim();
                if (cookieName && !['XSRF-TOKEN', 'laravel_session'].includes(cookieName)) {
                    document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                    document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                }
            });
            
            // Retry with minimal headers
            originalRequest.headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(localStorage.getItem('token') && { 'Authorization': `Bearer ${localStorage.getItem('token')}` })
            };
            
            return instance(originalRequest);
        }

        console.error('API Error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method,
            message: error.message
        });

        return Promise.reject(error);
    }
);

// Specialized method for review operations
instance.reviewAnswer = async (submissionId, answerId, reviewData) => {
    const url = `/audit-submissions/${submissionId}/answers/${answerId}/review`;
    
    try {
        const response = await instance({
            url,
            method: 'PUT',
            data: reviewData,
            headers: {
                'Content-Type': 'application/json',
                'X-HTTP-Method-Override': 'PUT'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Review request failed:', error);
        throw error;
    }
};

export default instance;