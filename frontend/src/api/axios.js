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
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
    },
    timeout: 30000,
    withCredentials: true
});

// ✅ CRITICAL: Custom transformRequest to prevent axios from converting FormData
// This MUST be set BEFORE any requests are made
const customTransformRequest = (data, headers) => {
    if (DEBUG) {
        console.log('🔄 transformRequest called - data type:', data?.constructor?.name);
    }
    
    if (data instanceof FormData) {
        // ✅ CRITICAL: For FormData, do NOT set any Content-Type
        // Browser MUST set multipart/form-data with boundary automatically
        if (DEBUG) {
            console.log('✅ FormData detected in transformRequest - returning unchanged');
        }
        // Make sure headers is an object we can modify
        if (headers && typeof headers === 'object') {
            delete headers['Content-Type'];
            // Also remove any encoding-related headers
            delete headers['Content-Encoding'];
        }
        return data;
    }
    
    if (data && typeof data === 'object') {
        return JSON.stringify(data);
    }
    return data;
};

// Override BOTH default and instance transformRequest
axios.defaults.transformRequest = [customTransformRequest];
instance.defaults.transformRequest = [customTransformRequest];

// ✅ ADDITIONAL: Block axios from auto-setting Content-Type for FormData
// by overriding the request adapter to check before sending
const originalAdapter = instance.defaults.adapter;
instance.defaults.adapter = async (config) => {
    if (config.data instanceof FormData) {
        // ✅ CRITICAL: Ensure no Content-Type for FormData requests
        delete config.headers['Content-Type'];
        if (DEBUG) {
            console.log('🔒 Adapter: Deleted Content-Type for FormData request');
        }
    }
    // Call original adapter
    return originalAdapter(config);
};

// Single request interceptor to handle all authentication and CSRF
instance.interceptors.request.use(
    async (config) => {
        // Clean up unnecessary cookies before each request
        cleanupUnnecessaryCookies();

        // Get auth token - always fetch fresh from localStorage
        const token = localStorage.getItem('token');
        
        // CRITICAL: Check if data is FormData
        const isFormData = config.data instanceof FormData;
        
        if (DEBUG) {
            console.log('📤 REQUEST INTERCEPTOR');
            console.log('   URL:', config.url, '| Method:', config.method);
            console.log('   Is FormData:', isFormData);
        }
        
        if (isFormData) {
            // ✅ FOR FORMDATA: Modify headers in-place WITHOUT replacing the object
            if (DEBUG) {
                console.log('   🎯 FormData path - updating headers in-place');
            }
            
            // Add auth headers without touching Content-Type
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
            
            // Ensure Content-Type is NOT set (browser will auto-set multipart/form-data)
            delete config.headers['Content-Type'];
            
            if (DEBUG) {
                console.log('   ✅ Content-Type deleted for FormData');
                console.log('   ✅ Browser will auto-set: multipart/form-data; boundary=...');
            }
        } else {
            // ✅ FOR JSON: Set Content-Type and other headers
            if (DEBUG) {
                console.log('   🎯 JSON path - setting Content-Type');
            }
            
            config.headers['Content-Type'] = 'application/json';
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        // Set common headers for both FormData and JSON
        config.headers['Accept'] = 'application/json';
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        
        // Log token usage for debugging (only in development)
        if (DEBUG && token) {
            console.log('Auth: Using token:', token.substring(0, 20) + '...');
        }

        // Handle CSRF token for state-changing operations
        if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method.toLowerCase())) {
            // If using Bearer token authentication, skip CSRF token requirement
            if (token) {
                if (DEBUG) {
                    console.log('CSRF: Skipped (using Bearer token)');
                }
            } else {
                // Only use CSRF token if not using Bearer authentication
                const csrfToken = await ensureCsrfToken();
                
                if (csrfToken) {
                    config.headers['X-XSRF-TOKEN'] = csrfToken;
                    if (DEBUG) {
                        console.log('CSRF: Using CSRF token');
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
            console.log('✅ Final headers:', Object.keys(config.headers).join(', '));
            if (isFormData) {
                console.log(`✅ FormData: Content-Type present = ${'Content-Type' in config.headers}`);
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

// ✅ DIRECT FILE UPLOAD using Fetch API (avoids axios FormData issues)
export const uploadProofImage = async (answerId, formData) => {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/audit-answers/${answerId}/proof-image`;
    
    if (DEBUG) {
        console.log('📤 Uploading proof image via Fetch API');
        console.log('   URL:', url);
        console.log('   Answer ID:', answerId);
        console.log('   FormData entries:', Array.from(formData.entries()).map(([k, v]) => [k, v instanceof File ? `File(${v.name}, ${v.size}b)` : v]));
    }
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            // ✅ CRITICAL: Do NOT set Content-Type - browser will set multipart/form-data with boundary
        },
        body: formData,  // FormData will be sent as multipart/form-data automatically
        credentials: 'include'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        if (DEBUG) {
            console.error('❌ Upload failed:', {
                status: response.status,
                statusText: response.statusText,
                data: data
            });
        }
        throw {
            response: {
                status: response.status,
                statusText: response.statusText,
                data: data
            }
        };
    }
    
    if (DEBUG) {
        console.log('✅ Upload successful:', data);
    }
    
    return { data };
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