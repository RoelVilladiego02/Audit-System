import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './useAuth';
import api from '../api/axios';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        company: ''
    });
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
    const [touchedFields, setTouchedFields] = useState({});

    const { register, user, clearAuthData } = useAuth();
    const navigate = useNavigate();

    // Clear any existing auth data when component mounts
    useEffect(() => {
        clearAuthData();
    }, [clearAuthData]);

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            const redirectTo = user.role === 'admin' ? '/admin' : '/dashboard';
            navigate(redirectTo, { replace: true });
        }
    }, [user, navigate]);

    // Enhanced password strength checker
    const checkPasswordStrength = useCallback((password) => {
        let score = 0;
        let feedback = [];
        let requirements = [];

        // Length check
        if (password.length >= 8) {
            score++;
        } else {
            feedback.push('at least 8 characters');
            requirements.push('8+ characters');
        }

        // Lowercase check
        if (/[a-z]/.test(password)) {
            score++;
        } else {
            feedback.push('lowercase letter');
            requirements.push('lowercase (a-z)');
        }

        // Uppercase check
        if (/[A-Z]/.test(password)) {
            score++;
        } else {
            feedback.push('uppercase letter');
            requirements.push('uppercase (A-Z)');
        }

        // Number check
        if (/\d/.test(password)) {
            score++;
        } else {
            feedback.push('number');
            requirements.push('number (0-9)');
        }

        // Special character check
        if (/[^A-Za-z0-9]/.test(password)) {
            score++;
        } else {
            feedback.push('special character');
            requirements.push('special (!@#$)');
        }

        const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthColors = ['danger', 'danger', 'warning', 'info', 'success'];

        return {
            score,
            label: strengthLabels[score] || 'Very Weak',
            color: strengthColors[score] || 'danger',
            feedback: feedback.length > 0 ? `Missing: ${feedback.join(', ')}` : 'Strong password!',
            requirements,
            isStrong: score >= 4
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear errors when user starts typing
        if (error) setError('');
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        // Check password strength
        if (name === 'password') {
            setPasswordStrength(checkPasswordStrength(value));
        }

        // Real-time validation for password confirmation
        if (name === 'password_confirmation' && value && formData.password) {
            if (value !== formData.password) {
                setFieldErrors(prev => ({
                    ...prev,
                    password_confirmation: 'Passwords do not match'
                }));
            } else {
                setFieldErrors(prev => ({
                    ...prev,
                    password_confirmation: ''
                }));
            }
        }
    };

    const handleBlur = (e) => {
        const { name } = e.target;
        setTouchedFields(prev => ({
            ...prev,
            [name]: true
        }));
        
        // Validate field on blur
        validateField(name, formData[name]);
    };

    const validateField = (name, value) => {
        let error = '';

        switch (name) {
            case 'name':
                if (!value.trim()) {
                    error = 'Full name is required';
                } else if (value.trim().length < 2) {
                    error = 'Name must be at least 2 characters';
                } else if (value.trim().length > 50) {
                    error = 'Name cannot exceed 50 characters';
                } else if (!/^[a-zA-Z\s'-]+$/.test(value.trim())) {
                    error = 'Name can only contain letters, spaces, hyphens, and apostrophes';
                }
                break;

            case 'email':
                if (!value) {
                    error = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    error = 'Please enter a valid email address';
                } else if (value.length > 255) {
                    error = 'Email cannot exceed 255 characters';
                }
                break;

            case 'password':
                if (!value) {
                    error = 'Password is required';
                } else if (value.length < 8) {
                    error = 'Password must be at least 8 characters';
                } else if (value.length > 255) {
                    error = 'Password cannot exceed 255 characters';
                } else {
                    const strength = checkPasswordStrength(value);
                    if (strength.score < 3) {
                        error = 'Password is too weak. Please include uppercase, lowercase, numbers, and special characters.';
                    }
                }
                break;

            case 'password_confirmation':
                if (!value) {
                    error = 'Please confirm your password';
                } else if (formData.password && value !== formData.password) {
                    error = 'Passwords do not match';
                }
                break;

            case 'company':
                if (value && value.length > 255) {
                    error = 'Company name cannot exceed 255 characters';
                }
                break;

            default:
                break;
        }

        if (error) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: error
            }));
        } else {
            setFieldErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }

        return !error;
    };

    const validateForm = () => {
        const errors = {};
        let isValid = true;

        // Validate all fields
        Object.keys(formData).forEach(field => {
            if (!validateField(field, formData[field])) {
                isValid = false;
            }
        });

        // Mark all fields as touched
        setTouchedFields({
            name: true,
            email: true,
            password: true,
            password_confirmation: true,
            company: true
        });

        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        if (!validateForm()) {
            setError('Please correct the errors below.');
            // Focus on first field with error
            const firstErrorField = Object.keys(fieldErrors).find(field => fieldErrors[field]);
            if (firstErrorField) {
                document.getElementById(firstErrorField)?.focus();
            }
            return;
        }

        setError('');
        setIsLoading(true);

        try {
            // Clear any existing authentication data before registration
            console.log('Clearing existing auth data before registration...');
            clearAuthData();
            
            // Wait a moment to ensure clearing is complete
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const userData = await register(
                formData.name.trim(),
                formData.email.toLowerCase().trim(),
                formData.password,
                formData.password_confirmation,
                formData.company.trim()
            );
            
            if (userData) {
                console.log('Registration successful for user:', {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    role: userData.role
                });
                
                // Don't auto-redirect, let the user manually navigate
                // This prevents accessing stale data
                navigate('/login', { 
                    replace: true,
                    state: { 
                        message: 'Registration successful! Please log in with your new account.',
                        email: formData.email.toLowerCase().trim()
                    }
                });
            } else {
                setError('Registration completed but failed to log in automatically. Please try logging in manually.');
                setTimeout(() => {
                    navigate('/login', { 
                        replace: true,
                        state: { 
                            message: 'Registration successful! Please log in with your credentials.',
                            email: formData.email.toLowerCase().trim()
                        }
                    });
                }, 3000);
            }
        } catch (err) {
            console.error('Registration error:', err);
            
            let errorMessage = 'Registration failed. Please try again.';
            
            // Handle validation errors from server
            if (err.response?.data?.errors) {
                const serverErrors = err.response.data.errors;
                const newFieldErrors = {};
                
                Object.keys(serverErrors).forEach(field => {
                    if (Array.isArray(serverErrors[field])) {
                        newFieldErrors[field] = serverErrors[field][0];
                    } else {
                        newFieldErrors[field] = serverErrors[field];
                    }
                });
                
                setFieldErrors(prev => ({ ...prev, ...newFieldErrors }));
                errorMessage = 'Please correct the errors below.';
            } else if (err.response?.data?.error) {
                // Handle specific error messages (like "email already taken")
                const errorText = err.response.data.error.toLowerCase();
                if (errorText.includes('email') && errorText.includes('taken')) {
                    errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
                    setFieldErrors(prev => ({ 
                        ...prev, 
                        email: 'This email is already registered. Please use a different email or try logging in.' 
                    }));
                } else if (errorText.includes('password')) {
                    errorMessage = 'Password requirements not met. Please check your password and try again.';
                    setFieldErrors(prev => ({ 
                        ...prev, 
                        password: 'Password requirements not met. Please check your password and try again.' 
                    }));
                } else {
                    errorMessage = err.response.data.error;
                }
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.status === 422) {
                errorMessage = 'Invalid input. Please check your information and try again.';
            } else if (err.response?.status === 409) {
                errorMessage = 'An account with this email already exists. Please try logging in instead.';
                setFieldErrors(prev => ({ ...prev, email: 'This email is already registered' }));
            } else if (err.response?.status >= 500) {
                errorMessage = 'Server error. Please try again later.';
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        if (field === 'password') {
            setShowPassword(!showPassword);
        } else {
            setShowConfirmPassword(!showConfirmPassword);
        }
    };

    const getFieldValidationClass = (fieldName) => {
        if (!touchedFields[fieldName]) return '';
        return fieldErrors[fieldName] ? 'is-invalid' : formData[fieldName] ? 'is-valid' : '';
    };

    return (
        <div className="min-vh-100 d-flex align-items-center bg-light py-3">
            <div className="container-fluid px-3">
                <div className="row justify-content-center">
                    <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5 col-xxl-4">
                        <div className="card shadow-lg border-0">
                            <div className="card-body p-3 p-sm-4 p-md-5">
                                {/* Header */}
                                <div className="text-center mb-4">
                                    <div className="mb-3">
                                        <i className="bi bi-person-plus text-primary" style={{ fontSize: '2.5rem' }}></i>
                                    </div>
                                    <h1 className="h3 fw-bold text-dark mb-2">
                                        Create Account
                                    </h1>
                                    <p className="text-muted mb-0 small">
                                        Join our audit system today
                                    </p>
                                </div>

                                {/* Error Alert */}
                                {error && (
                                    <div className="alert alert-danger d-flex align-items-start mb-4" role="alert">
                                        <i className="bi bi-exclamation-triangle-fill me-2 mt-1 flex-shrink-0"></i>
                                        <div className="flex-grow-1">
                                            {error}
                                            {error.includes('already registered') && (
                                                <div className="mt-2">
                                                    <Link to="/login" className="btn btn-outline-primary btn-sm">
                                                        <i className="bi bi-box-arrow-in-right me-1"></i>
                                                        Go to Login
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Registration Form */}
                                <form onSubmit={handleSubmit} noValidate>
                                    {/* Name Field */}
                                    <div className="mb-3">
                                        <label htmlFor="name" className="form-label fw-semibold small">
                                            Full Name <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-person text-muted"></i>
                                            </span>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                required
                                                className={`form-control border-start-0 ps-0 ${getFieldValidationClass('name')}`}
                                                placeholder="Enter your full name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                disabled={isLoading}
                                                autoComplete="name"
                                                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                                            />
                                            {formData.name && !fieldErrors.name && touchedFields.name && (
                                                <span className="input-group-text bg-light border-start-0 text-success">
                                                    <i className="bi bi-check"></i>
                                                </span>
                                            )}
                                        </div>
                                        {fieldErrors.name && (
                                            <div id="name-error" className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Email Field */}
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label fw-semibold small">
                                            Email Address <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-envelope text-muted"></i>
                                            </span>
                                            <input
                                                id="email"
                                                name="email"
                                                type="email"
                                                required
                                                className={`form-control border-start-0 ps-0 ${getFieldValidationClass('email')}`}
                                                placeholder="Enter your email address"
                                                value={formData.email}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                disabled={isLoading}
                                                autoComplete="email"
                                                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                                            />
                                            {formData.email && !fieldErrors.email && touchedFields.email && (
                                                <span className="input-group-text bg-light border-start-0 text-success">
                                                    <i className="bi bi-check"></i>
                                                </span>
                                            )}
                                        </div>
                                        {fieldErrors.email && (
                                            <div id="email-error" className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.email}
                                            </div>
                                        )}
                                    </div>

                                    {/* Password Field */}
                                    <div className="mb-3">
                                        <label htmlFor="password" className="form-label fw-semibold small">
                                            Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-lock text-muted"></i>
                                            </span>
                                            <input
                                                id="password"
                                                name="password"
                                                type={showPassword ? "text" : "password"}
                                                required
                                                className={`form-control border-start-0 border-end-0 ps-0 ${getFieldValidationClass('password')}`}
                                                placeholder="Create a strong password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                disabled={isLoading}
                                                autoComplete="new-password"
                                                aria-describedby="password-strength password-error"
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text bg-light border-start-0"
                                                onClick={() => togglePasswordVisibility('password')}
                                                disabled={isLoading}
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                                            </button>
                                        </div>
                                        
                                        {/* Password Requirements */}
                                        {!touchedFields.password && (
                                            <div className="mt-2">
                                                <small className="text-muted d-block">Password must contain:</small>
                                                <div className="row g-0 mt-1">
                                                    <div className="col-6">
                                                        <small className="text-muted">• 8+ characters</small><br/>
                                                        <small className="text-muted">• Uppercase letter</small>
                                                    </div>
                                                    <div className="col-6">
                                                        <small className="text-muted">• Lowercase letter</small><br/>
                                                        <small className="text-muted">• Number & symbol</small>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Password Strength Indicator */}
                                        {formData.password && touchedFields.password && (
                                            <div id="password-strength" className="mt-2">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <small className="text-muted">Password strength:</small>
                                                    <small className={`text-${passwordStrength.color} fw-semibold`}>
                                                        {passwordStrength.label}
                                                    </small>
                                                </div>
                                                <div className="progress mb-1" style={{ height: '4px' }}>
                                                    <div
                                                        className={`progress-bar bg-${passwordStrength.color} transition`}
                                                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                                    ></div>
                                                </div>
                                                <small className={`text-${passwordStrength.color} d-block`}>
                                                    {passwordStrength.feedback}
                                                </small>
                                            </div>
                                        )}
                                        
                                        {fieldErrors.password && (
                                            <div id="password-error" className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.password}
                                            </div>
                                        )}
                                    </div>

                                    {/* Company Field */}
                                    <div className="mb-3">
                                        <label htmlFor="company" className="form-label fw-semibold small">
                                            Company <span className="text-muted">(Optional)</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-building text-muted"></i>
                                            </span>
                                            <input
                                                id="company"
                                                name="company"
                                                type="text"
                                                className={`form-control border-start-0 ps-0 ${getFieldValidationClass('company')}`}
                                                placeholder="Enter your company name (optional)"
                                                value={formData.company}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                disabled={isLoading}
                                                autoComplete="organization"
                                                aria-describedby={fieldErrors.company ? 'company-error' : undefined}
                                            />
                                            {formData.company && !fieldErrors.company && touchedFields.company && (
                                                <span className="input-group-text bg-light border-start-0 text-success">
                                                    <i className="bi bi-check"></i>
                                                </span>
                                            )}
                                        </div>
                                        {fieldErrors.company && (
                                            <div id="company-error" className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.company}
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password Field */}
                                    <div className="mb-4">
                                        <label htmlFor="password_confirmation" className="form-label fw-semibold small">
                                            Confirm Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-end-0">
                                                <i className="bi bi-lock-fill text-muted"></i>
                                            </span>
                                            <input
                                                id="password_confirmation"
                                                name="password_confirmation"
                                                type={showConfirmPassword ? "text" : "password"}
                                                required
                                                className={`form-control border-start-0 border-end-0 ps-0 ${getFieldValidationClass('password_confirmation')}`}
                                                placeholder="Confirm your password"
                                                value={formData.password_confirmation}
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                disabled={isLoading}
                                                autoComplete="new-password"
                                                aria-describedby={fieldErrors.password_confirmation ? 'confirm-password-error' : undefined}
                                            />
                                            <button
                                                type="button"
                                                className="input-group-text bg-light border-start-0"
                                                onClick={() => togglePasswordVisibility('confirm')}
                                                disabled={isLoading}
                                                aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                                            >
                                                <i className={`bi ${showConfirmPassword ? 'bi-eye-slash' : 'bi-eye'} text-muted`}></i>
                                            </button>
                                        </div>
                                        
                                        {/* Password Match Indicator */}
                                        {formData.password_confirmation && formData.password && touchedFields.password_confirmation && (
                                            <div className="mt-2">
                                                {formData.password === formData.password_confirmation ? (
                                                    <small className="text-success">
                                                        <i className="bi bi-check-circle me-1"></i>
                                                        Passwords match
                                                    </small>
                                                ) : (
                                                    <small className="text-danger">
                                                        <i className="bi bi-x-circle me-1"></i>
                                                        Passwords do not match
                                                    </small>
                                                )}
                                            </div>
                                        )}
                                        
                                        {fieldErrors.password_confirmation && (
                                            <div id="confirm-password-error" className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {fieldErrors.password_confirmation}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="d-grid mb-4">
                                        <button
                                            type="submit"
                                            disabled={isLoading || Object.values(fieldErrors).some(error => error)}
                                            className="btn btn-primary btn-lg fw-semibold"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Creating Account...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-person-plus me-2"></i>
                                                    Create Account
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Email Already Taken Suggestion */}
                                {fieldErrors.email && fieldErrors.email.includes('already registered') && (
                                    <div className="alert alert-info mt-3 mb-3">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-info-circle me-2"></i>
                                            <div>
                                                <strong>Email already exists?</strong>
                                                <p className="mb-2 small">This email is already registered. You can either:</p>
                                                <div className="d-flex gap-2">
                                                    <Link to="/login" className="btn btn-outline-primary btn-sm">
                                                        <i className="bi bi-box-arrow-in-right me-1"></i>
                                                        Sign In Instead
                                                    </Link>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-outline-secondary btn-sm"
                                                        onClick={() => {
                                                            setFieldErrors(prev => ({ ...prev, email: '' }));
                                                            setError('');
                                                        }}
                                                    >
                                                        <i className="bi bi-pencil me-1"></i>
                                                        Use Different Email
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="text-center">
                                    <p className="text-muted mb-0 small">
                                        Already have an account?{' '}
                                        <Link 
                                            to="/login" 
                                            className="text-primary text-decoration-none fw-semibold"
                                        >
                                            Sign In
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Additional Info */}
                        <div className="text-center mt-3">
                            <small className="text-muted">
                                <i className="bi bi-shield-check me-1"></i>
                                By creating an account, you agree to our terms of service
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;