import axios from 'axios';
import { API_URL, BASE_URL, DEBUG } from '../config/environment';

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

// Function to ensure CSRF token is available
const ensureCsrfToken = async () => {
    let csrfToken = getXsrfToken();
    if (DEBUG) {
        console.log('Current CSRF token:', csrfToken ? 'Found' : 'Not found');
        console.log('Current cookies:', document.cookie);
    }
    
    if (!csrfToken) {
        try {
            if (DEBUG) {
                console.log('Fetching CSRF token from:', BASE_URL + '/sanctum/csrf-cookie');
            }
            
            const response = await axios.get('/sanctum/csrf-cookie', {
                baseURL: BASE_URL,
                withCredentials: true,
                headers: {
                    'Accept': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                }
            });
            
            if (DEBUG) {
                console.log('CSRF response status:', response.status);
                console.log('CSRF response headers:', response.headers);
            }
            
            csrfToken = getXsrfToken();
            if (DEBUG) {
                console.log('CSRF token after fetch:', csrfToken ? 'Success' : 'Failed');
                console.log('Cookies after fetch:', document.cookie);
            }
        } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
            if (DEBUG) {
                console.error('CSRF fetch error details:', error.response?.data);
            }
        }
    }
    return csrfToken;
};

const instance = axios.create({
    baseURL: API_URL, // Using environment config instead of process.env
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'ngrok-skip-browser-warning': 'true', // Bypass ngrok browser warning
    },
    timeout: 30000,
    withCredentials: true,
});

// Single request interceptor to handle all authentication and CSRF
instance.interceptors.request.use(
    async (config) => {
        // Clean up unnecessary cookies before each request
        cleanupUnnecessaryCookies();

        // Get auth token - always fetch fresh from localStorage
        const token = localStorage.getItem('token');
        
        // Set base headers
        config.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
        
        // Log token usage for debugging (only in development)
        if (DEBUG) {
            if (token) {
                console.log('Using token for request:', token.substring(0, 20) + '...');
            } else {
                console.log('No token found for request');
            }
        }

        // Handle CSRF token for state-changing operations
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
            // Ensure CSRF token is available before making the request
            const csrfToken = await ensureCsrfToken();
            
            if (csrfToken) {
                config.headers['X-XSRF-TOKEN'] = csrfToken;
                if (DEBUG) {
                    console.log('Using token for request:', csrfToken.substring(0, 20) + '...');
                }
            } else {
                console.warn('No CSRF token available for request:', config.url);
                // Try to fetch CSRF token one more time with a direct request
                try {
                    const directResponse = await fetch(BASE_URL + '/sanctum/csrf-cookie', {
                        method: 'GET',
                        credentials: 'include',
                        headers: {
                            'Accept': 'application/json',
                            'ngrok-skip-browser-warning': 'true'
                        }
                    });
                    
                    if (directResponse.ok) {
                        const newToken = getXsrfToken();
                        if (newToken) {
                            config.headers['X-XSRF-TOKEN'] = newToken;
                            console.log('CSRF token fetched via direct request');
                        }
                    }
                } catch (directError) {
                    console.error('Direct CSRF fetch also failed:', directError);
                }
            }
        }

        // Add method override for PUT requests
        if (config.method?.toLowerCase() === 'put') {
            config.headers['X-HTTP-Method-Override'] = 'PUT';
        }

        // Log header size for debugging (only in development)
        if (DEBUG) {
            const headerSize = JSON.stringify(config.headers).length;
            const cookieSize = document.cookie.length;
            console.log(`Request to ${config.url}: Headers=${headerSize}b, Cookies=${cookieSize}b, Total≈${headerSize + cookieSize}b`);
        }

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
                const newCsrfToken = await ensureCsrfToken();
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
                    // Clear auth data but don't redirect automatically
                    // Let the components handle the redirect
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    delete instance.defaults.headers.common['Authorization'];
                }
            }
        }

        // Handle 431 errors by cleaning cookies and retrying once
        if (error.response?.status === 431 && !originalRequest._headerRetry) {
            originalRequest._headerRetry = true;
            if (DEBUG) {
                console.warn('431 Request Header Fields Too Large - cleaning cookies and retrying');
            }
            
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

        // Log API errors (always log errors, but with different detail levels)
        if (DEBUG) {
            console.error('API Error:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config?.url,
                method: error.config?.method,
                message: error.message
            });
        } else {
            console.error('API Error:', error.message);
        }

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

// Function to completely reset axios instance (for logout)
instance.resetAuth = () => {
    // Clear any default headers
    delete instance.defaults.headers.common['Authorization'];
    delete instance.defaults.headers.Authorization;
    
    // Clear any cached tokens in interceptors
    if (DEBUG) {
        console.log('Axios instance auth reset');
    }
    
    // Force clear any remaining cookies
    document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.split('=');
        const cookieName = name.trim();
        if (cookieName && !['XSRF-TOKEN', 'laravel_session'].includes(cookieName)) {
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
            document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
    });
};

// Pre-fetch CSRF token on app initialization
ensureCsrfToken().then(token => {
    if (DEBUG) {
        console.log('Initial CSRF token fetch:', token ? 'Success' : 'Failed');
    }
}).catch(error => {
    console.error('Initial CSRF token fetch failed:', error);
});

export default instance;