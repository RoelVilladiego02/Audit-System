import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './useAuth';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return; // Prevent multiple submissions

        setError('');
        setIsLoading(true);

        try {
            const userData = await register(
                formData.name,
                formData.email,
                formData.password,
                formData.password_confirmation
            );
            
            if (userData) {
                navigate('/', { replace: true }); // Using replace to prevent back button issues
            } else {
                setError('Registration successful but failed to log in. Please try logging in manually.');
                navigate('/login', { replace: true });
            }
        } catch (err) {
            console.error('Registration error:', err);
            const errorMessage = err.response?.data?.message;
            if (typeof errorMessage === 'object') {
                // Handle validation errors
                const messages = Object.values(errorMessage).flat();
                setError(messages.join('\n'));
            } else {
                setError(errorMessage || 'Registration failed. Please try again.');
            }
            setIsLoading(false);
        }
    };

    return (
        <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
            <div className="card shadow-lg p-4" style={{ maxWidth: '400px' }}>
                <div className="card-body">
                    <h2 className="card-title text-center mb-4 h3">
                        Create your account
                    </h2>
                    <p className="text-center text-muted mb-4">
                        Or{' '}
                        <Link to="/login" className="text-primary text-decoration-none">
                            sign in to your existing account
                        </Link>
                    </p>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="name" className="form-label">Full name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className="form-control"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Email address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="form-control"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="form-control"
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>
                        <div className="mb-4">
                            <label htmlFor="password_confirmation" className="form-label">Confirm password</label>
                            <input
                                id="password_confirmation"
                                name="password_confirmation"
                                type="password"
                                required
                                className="form-control"
                                placeholder="Confirm your password"
                                value={formData.password_confirmation}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </div>

                        <div className="d-grid">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn btn-primary"
                            >
                                {isLoading ? 'Creating account...' : 'Create account'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Register;
