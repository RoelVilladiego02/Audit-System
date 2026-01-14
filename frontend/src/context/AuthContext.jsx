import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Initialize authentication state
    useEffect(() => {
        const initializeAuth = async () => {
            setLoading(true);
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                try {
                    // Parse stored user data
                    const userData = JSON.parse(storedUser);
                    
                    // Verify token is still valid by checking with server
                    const response = await axios.get('/user', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.data) {
                        // Update user data with fresh data from server
                        const freshUserData = response.data;
                        localStorage.setItem('user', JSON.stringify(freshUserData));
                        setUser(freshUserData);
                        
                        // Set default auth header for axios
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                        
                        console.log('Auth initialized successfully:', {
                            id: freshUserData.id,
                            email: freshUserData.email,
                            role: freshUserData.role
                        });
                    } else {
                        throw new Error('Invalid user data received');
                    }
                } catch (err) {
                    console.error('Auth initialization failed:', err);
                    // Clear invalid tokens/data
                    clearAuthData();
                }
            }
            setLoading(false);
        };

        initializeAuth();
    }, []);

    const clearAuthData = () => {
        // Clear user state immediately
        setUser(null);
        
        // Clear localStorage completely
        localStorage.clear();
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear axios default headers
        delete axios.defaults.headers.common['Authorization'];
        
        // Clear any cached axios instance headers
        if (axios.defaults.headers) {
            delete axios.defaults.headers.Authorization;
        }
        
        // Reset axios instance
        if (axios.resetAuth) {
            axios.resetAuth();
        }
        
        // Reset state
        setError('');
        setLoading(false);
        
        // Force clear any remaining cookies that might contain auth data
        document.cookie.split(';').forEach(cookie => {
            const [name] = cookie.split('=');
            const cookieName = name.trim();
            if (cookieName && !['XSRF-TOKEN', 'laravel_session'].includes(cookieName)) {
                document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
                document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
            }
        });
        
        // Force clear any React state
        setLoading(false);
        setError('');
        
        console.log('Authentication data cleared completely');
    };

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No token found');
            }

            const response = await axios.get('/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('Auth check successful:', response.data);
            
            if (response.data) {
                const userData = response.data;
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                return userData;
            } else {
                throw new Error('No user data received');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            clearAuthData();
            return null;
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        setLoading(true);
        setError('');
        
        try {
            console.log('Attempting login for:', email);
            
            const response = await axios.post('/auth/login', { 
                email: email.toLowerCase().trim(), 
                password 
            });

            console.log('Login response:', {
                status: response.status,
                hasToken: !!response.data.access_token,
                hasUser: !!response.data.user
            });

            if (response.data.access_token && response.data.user) {
                const { access_token, user: userData } = response.data;
                
                // Validate user data
                if (!userData.id || !userData.email || !userData.role) {
                    throw new Error('Incomplete user data received from server');
                }
                
                // Store authentication data
                localStorage.setItem('token', access_token);
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Set default authorization header
                axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                
                // Update state
                setUser(userData);
                setError('');
                
                console.log('Login successful:', {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role
                });
                
                return userData;
            } else {
                throw new Error('Invalid response: missing token or user data');
            }
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'Login failed. Please try again.';
            
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 401) {
                errorMessage = 'Invalid email or password. Please check your credentials.';
            } else if (error.response?.status === 422) {
                errorMessage = 'Invalid input format. Please check your email and password.';
            } else if (error.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
            // Don't clear auth data on login errors - just clear the error state
            setLoading(false);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const register = async (name, email, password, password_confirmation, company = '') => {
        setLoading(true);
        setError('');
        
        try {
            // Clear any existing auth data before registration
            clearAuthData();
            await new Promise(resolve => setTimeout(resolve, 50)); // Brief pause
            
            console.log('Attempting registration for:', email);
            
            const response = await axios.post('/auth/register', {
                name: name.trim(),
                email: email.toLowerCase().trim(),
                password,
                password_confirmation,
                company: company.trim() || null
            });

            console.log('Registration response:', {
                status: response.status,
                hasToken: !!response.data.access_token,
                hasUser: !!response.data.user
            });

            if (response.data.access_token && response.data.user) {
                const { access_token, user: userData } = response.data;
                
                // Validate user data
                if (!userData.id || !userData.email) {
                    throw new Error('Incomplete user data received from server');
                }
                
                // Store authentication data
                localStorage.setItem('token', access_token);
                localStorage.setItem('user', JSON.stringify(userData));
                
                // Set default authorization header
                axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
                
                // Update state
                setUser(userData);
                setError('');
                
                console.log('Registration successful:', {
                    id: userData.id,
                    email: userData.email,
                    role: userData.role || 'user'
                });
                
                return userData;
            } else {
                throw new Error('Invalid response: missing token or user data');
            }
        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'Registration failed. Please try again.';
            let errorType = 'general';
            
            if (error.response?.data?.errors) {
                // Handle validation errors
                const errors = error.response.data.errors;
                const errorMessages = Object.values(errors).flat();
                errorMessage = errorMessages.join('. ');
                errorType = 'validation';
            } else if (error.response?.data?.error) {
                // Handle specific error messages (like "email already taken")
                const errorText = error.response.data.error.toLowerCase();
                if (errorText.includes('email') && errorText.includes('taken')) {
                    errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
                    errorType = 'email_taken';
                } else if (errorText.includes('password')) {
                    errorMessage = 'Password requirements not met. Please check your password and try again.';
                    errorType = 'password';
                } else {
                    errorMessage = error.response.data.error;
                    errorType = 'specific';
                }
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response?.status === 422) {
                errorMessage = 'Invalid input. Please check your information and try again.';
                errorType = 'validation';
            } else if (error.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
                errorType = 'server';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setError(errorMessage);
            clearAuthData();
            throw error; // Re-throw to let component handle specific error details
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        
        try {
            // Attempt to call logout endpoint
            if (user && localStorage.getItem('token')) {
                console.log('Calling logout endpoint...');
                await axios.post('/auth/logout');
                console.log('Logout endpoint called successfully');
            }
        } catch (error) {
            console.error('Logout endpoint error (continuing with cleanup):', error);
            // Continue with local logout even if server call fails
        } finally {
            // Always clear local state
            console.log('Clearing authentication data...');
            clearAuthData();
            setLoading(false);
            
            // Force a complete page reload to clear any cached state
            setTimeout(() => {
                // Clear any remaining session storage
                sessionStorage.clear();
                
                // Force navigation to login page with a hard reload
                window.location.replace('/login');
            }, 100);
        }
    };

    const refreshToken = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No token to refresh');
            }

            // Check if current token is still valid
            const response = await axios.get('/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.data) {
                const userData = response.data;
                localStorage.setItem('user', JSON.stringify(userData));
                setUser(userData);
                return userData;
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            clearAuthData();
            return null;
        }
    };

    const updateUser = (updatedUserData) => {
        const newUserData = { ...user, ...updatedUserData };
        localStorage.setItem('user', JSON.stringify(newUserData));
        setUser(newUserData);
    };

    const contextValue = {
        user,
        loading,
        error,
        login,
        logout,
        register,
        checkAuth,
        refreshToken,
        updateUser,
        clearError: () => setError(''),
        clearAuthData, // Expose the clearAuthData function
        
        // Role checking utilities
        isAdmin: user?.role === 'admin',
        isUser: user?.role === 'user',
        isAuthenticated: !!user,
        
        hasRole: (role) => {
            if (!user?.role) return false;
            
            // Handle comma-separated roles
            if (role.includes(',')) {
                const allowedRoles = role.split(',').map(r => r.trim().toLowerCase());
                return allowedRoles.includes(user.role.toLowerCase());
            }
            
            return user.role.toLowerCase() === role.toLowerCase();
        },
        
        hasAnyRole: (roles) => {
            if (!user?.role) return false;
            
            const roleArray = Array.isArray(roles) ? roles : [roles];
            return roleArray.some(role => user.role.toLowerCase() === role.toLowerCase());
        },
        
        // User info getters
        getUserId: () => user?.id,
        getUserEmail: () => user?.email,
        getUserName: () => user?.name,
        getUserRole: () => user?.role
    };

    // Loading spinner component
    if (loading && !user) {
        return (
            <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted">Loading...</h5>
                    <p className="text-muted">Please wait while we initialize your session.</p>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthProvider;