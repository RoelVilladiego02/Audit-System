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

const getHostBaseUrl = () => {
    if (BASE_URL) {
        return BASE_URL.replace(/\/+$/, '');
    }

    if (API_URL) {
        // Remove trailing /api or /api/ to hit Sanctum route (it lives outside /api prefix)
        return API_URL.replace(/\/api\/?$/, '').replace(/\/+$/, '');
    }

    return window.location.origin.replace(/\/+$/, '');
};

// Function to ensure CSRF token is available
const ensureCsrfToken = async () => {
    let csrfToken = getXsrfToken();
    if (DEBUG) {
        console.log('Current CSRF token:', csrfToken ? 'Found' : 'Not found');
        console.log('Current cookies:', document.cookie);
    }
    
    if (!csrfToken) {
        try {
            const csrfBase = getHostBaseUrl();
            if (DEBUG) {
                console.log('Fetching CSRF token from:', `${csrfBase}/sanctum/csrf-cookie`);
            }
            
            const response = await axios.get(`${csrfBase}/sanctum/csrf-cookie`, {
                withCredentials: true,
                headers: {
                    'Accept': 'application/json'
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
        // ⚠️ DO NOT set Content-Type here - it prevents FormData from working correctly!
        // The request interceptor will set it appropriately for each request
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 30000,
    withCredentials: true
});

// ✅ CRITICAL: Custom transformRequest to prevent axios from converting FormData
// Axios by default will convert FormData to application/x-www-form-urlencoded
// We need to return FormData untouched and ensure Content-Type is never set
const customTransformRequest = [
    (data, headers) => {
        if (DEBUG) {
            console.log('🔄 CUSTOM transformRequest called');
            console.log('   Data type:', data?.constructor?.name);
            console.log('   Headers before:', JSON.stringify(headers || {}));
        }
        
        // If data is FormData, return it completely untouched
        // Do NOT let axios modify it or set any Content-Type
        if (data instanceof FormData) {
            if (DEBUG) {
                console.log('   ✅ FormData detected in transformRequest');
                console.log('   ✅ Returning FormData as-is WITHOUT modification');
                console.log('   ✅ Browser will auto-set multipart/form-data with boundary');
            }
            // CRITICAL: Ensure no Content-Type in headers for FormData
            delete headers['Content-Type'];
            return data;
        }
        
        // For everything else, stringify as JSON
        if (data && typeof data === 'object') {
            headers['Content-Type'] = 'application/json';
            return JSON.stringify(data);
        }
        return data;
    }
];

// Override axios default transformRequest
instance.defaults.transformRequest = customTransformRequest;

// Single request interceptor to handle all authentication and CSRF
instance.interceptors.request.use(
    async (config) => {
        // Clean up unnecessary cookies before each request
        cleanupUnnecessaryCookies();

        // Get auth token - always fetch fresh from localStorage
        const token = localStorage.getItem('token');
        
        // CRITICAL: Check if data is FormData VERY EARLY
        const isFormData = config.data instanceof FormData;
        
        if (DEBUG) {
            console.log('📤 REQUEST INTERCEPTOR RUNNING');
            console.log('   URL:', config.url);
            console.log('   Method:', config.method);
            console.log('   Data type:', config.data?.constructor?.name || typeof config.data);
            console.log('   Is FormData:', isFormData);
        }
        
        if (isFormData) {
            // ✅ FOR FORMDATA: Set ONLY the headers that don't break multipart
            if (DEBUG) {
                console.log('   🎯 FORMDATA PATH: Setting minimal headers without Content-Type');
                console.log('   FormData entries:', Array.from(config.data.entries()).map(([k, v]) => [k, v instanceof File ? `File(${v.name}, ${v.type}, ${v.size}b)` : v]));
            }
            
            // Set minimal headers - NO Content-Type!
            config.headers = {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(token && { 'Authorization': `Bearer ${token}` }),
            };
            
            // ✅ TRIPLE-CHECK: Ensure Content-Type is NOT set
            delete config.headers['Content-Type'];
            
            if (DEBUG) {
                console.log('   ✅ Final headers for FormData:', config.headers);
                console.log('   ✅ Content-Type will be set by browser as: multipart/form-data; boundary=...');
                console.log('   ✅ Headers object after delete:', Object.keys(config.headers).join(', '));
                console.log('   ✅ Content-Type in headers:', 'Content-Type' in config.headers);
            }
        } else {
            // ✅ FOR JSON/Regular Requests: Set Content-Type to JSON
            if (DEBUG) {
                console.log('   🎯 JSON PATH: Setting JSON headers');
            }
            
            config.headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...config.headers,  // Spread any custom headers
            };
            
            if (DEBUG) {
                console.log('   ✅ Final headers for JSON:', config.headers);
            }
        }
        
        // Log token usage for debugging (only in development)
        if (DEBUG) {
            if (token) {
                console.log('Auth: Using token:', token.substring(0, 20) + '...');
            } else {
                console.log('Auth: No token found');
            }
        }

        // Handle CSRF token for state-changing operations
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
            // If using Bearer token authentication, skip CSRF token requirement
            if (token) {
                // Bearer token provides sufficient security, no CSRF needed
                if (DEBUG) {
                    console.log('CSRF: Skipped (using Bearer token)');
                }
            } else {
                // Only use CSRF token if not using Bearer authentication
                const csrfToken = await ensureCsrfToken();
                
                if (csrfToken) {
                    config.headers['X-XSRF-TOKEN'] = csrfToken;
                    if (DEBUG) {
                        console.log('CSRF: Using CSRF token:', csrfToken.substring(0, 20) + '...');
                    }
                } else {
                    console.warn('No CSRF token available for request:', config.url);
                }
            }
        }

        // Add method override for PUT requests
        if (config.method?.toLowerCase() === 'put') {
            config.headers['X-HTTP-Method-Override'] = 'PUT';
        }

        if (DEBUG) {
            const headerSize = JSON.stringify(config.headers).length;
            const cookieSize = document.cookie.length;
            console.log(`📊 Request Summary for ${config.url}:`);
            console.log(`   Headers=${headerSize}b, Cookies=${cookieSize}b, Total≈${headerSize + cookieSize}b`);
            if (isFormData) {
                console.log(`   ✅ FormData request - Content-Type in final headers: ${'Content-Type' in config.headers}`);
            }
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

        // Handle CSRF token expiry (419) - only retry if using session-based auth (not Bearer token)
        if (error.response?.status === 419 && !originalRequest._csrfRetry) {
            const token = localStorage.getItem('token');
            // If using Bearer token authentication, don't retry CSRF errors
            // Bearer tokens don't need CSRF protection
            if (!token && !originalRequest._csrfRetry) {
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
            } else if (token) {
                // If using Bearer token and getting 419, it's a backend configuration issue
                // The backend should not require CSRF for Bearer token requests
                console.warn('Received 419 error with Bearer token authentication. Backend CSRF configuration may be incorrect.');
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

// Draft API methods
export const draftAPI = {
    // Save a new draft submission
    saveDraft: async (payload) => {
        return instance.post('audit-submissions/save-draft', payload);
    },

    // Update an existing draft
    updateDraft: async (submissionId, answers) => {
        return instance.patch(`audit-submissions/${submissionId}/draft`, {
            answers: answers
        });
    },

    // Submit a draft (change status to submitted)
    submitDraft: async (submissionId) => {
        return instance.patch(`audit-submissions/${submissionId}/submit`);
    },

    // Get a specific submission (including drafts)
    getSubmission: async (submissionId) => {
        return instance.get(`audit-submissions/${submissionId}`);
    },

    // Delete a submission (draft or submitted)
    deleteSubmission: async (submissionId) => {
        return instance.delete(`audit-submissions/${submissionId}`);
    },

    // Update submission title
    updateTitle: async (submissionId, title) => {
        return instance.patch(`audit-submissions/${submissionId}/title`, {
            title: title
        });
    }
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