import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const response = await axios.get('/api/user', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    setUser(response.data);
                } catch (err) {
                    console.error('Auth initialization failed:', err);
                    localStorage.removeItem('token');
                    setUser(null);
                }
            }
            setLoading(false);
        };
        
        initAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Auth check successful:', response.data);
            
            // Store user data including role
            const userData = response.data;
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            return null;
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/auth/login', { 
                email, 
                password 
            });

            console.log('Login response:', response.data);

            if (response.data.access_token) {
                // Store the token
                localStorage.setItem('token', response.data.access_token);
                
                // Store user data including role
                if (response.data.user) {
                    const userData = response.data.user;
                    
                    // Make sure we have the required role information
                    if (!userData.role) {
                        console.error('No role information in user data:', userData);
                        throw new Error('User role information missing');
                    }
                    
                    // Store complete user data
                    localStorage.setItem('user', JSON.stringify(userData));
                    setUser(userData);
                    
                    console.log('User logged in successfully:', {
                        id: userData.id,
                        email: userData.email,
                        role: userData.role
                    });
                    
                    // Also set the authorization header for subsequent requests
                    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
                    
                    return userData;
                }
            }

            throw new Error('Invalid response from server');
        } catch (error) {
            const message = error.response?.data?.message || 
                           error.message || 
                           'Login failed. Please check your credentials.';
            console.error('Login error:', error);
            setError(message);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const register = async (name, email, password, password_confirmation) => {
        setLoading(true);
        setError('');
        try {
            const response = await axios.post('/api/auth/register', {
                name,
                email,
                password,
                password_confirmation
            });

            if (response.data.access_token) {
                localStorage.setItem('token', response.data.access_token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
                
                if (response.data.user) {
                    setUser(response.data.user);
                    return response.data.user;
                }
            }

            throw new Error('Invalid response from server');
        } catch (error) {
            setError(error.response?.data?.message || 'Registration failed');
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            // Call logout endpoint if available
            if (user) {
                await axios.post('/api/auth/logout');
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local state regardless of server response
            setUser(null);
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            // Redirect to login page
            window.location.href = '/login';
        }
    };

    const value = {
        user,
        loading,
        error,
        login,
        logout,
        register,
        checkAuth,
        isAdmin: user?.role === 'admin',
        isUser: user?.role === 'user',
        hasRole: (role) => {
            // Handle comma-separated roles
            if (role.includes(',')) {
                const allowedRoles = role.split(',').map(r => r.trim());
                return user?.role && allowedRoles.includes(user.role);
            }
            return user?.role === role;
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
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