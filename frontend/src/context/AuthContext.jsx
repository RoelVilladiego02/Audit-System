import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            checkAuth();
        } else {
            setLoading(false);
        }
    }, []);

    const checkAuth = async () => {
        try {
            const response = await axios.get('/api/user');
            console.log('Auth check successful:', response.data);
            setUser(response.data);
            return response.data;
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
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
                localStorage.setItem('token', response.data.access_token);
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
                
                if (response.data.user) {
                    setUser(response.data.user);
                    console.log('User logged in successfully:', response.data.user);
                    return response.data.user;
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
        hasRole: (role) => user?.role === role
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