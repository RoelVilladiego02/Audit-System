import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { apiInstance } from '../../api/axios';

const ProfilePage = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: ''
    });
    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        new_password_confirmation: ''
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                company: user.company || ''
            });
        }
    }, [user]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (formData.company && formData.company.length > 255) {
            newErrors.company = 'Company name cannot exceed 255 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setSuccess(false);

        try {
            const response = await apiInstance.patch('/user/profile', {
                name: formData.name.trim(),
                email: formData.email.trim(),
                company: formData.company.trim() || null
            });

            if (response.data) {
                // Update user in context
                updateUser(response.data);
                setSuccess(true);
                
                // Clear success message after 3 seconds
                setTimeout(() => setSuccess(false), 3000);
                
                console.log('Profile updated successfully');
            }
        } catch (error) {
            console.error('Profile update error:', error);
            
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else if (error.response?.data?.message) {
                setErrors({ general: error.response.data.message });
            } else {
                setErrors({ general: 'Failed to update profile. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const validatePasswordForm = () => {
        const newErrors = {};

        if (!passwordData.current_password) {
            newErrors.current_password = 'Current password is required';
        }

        if (!passwordData.new_password) {
            newErrors.new_password = 'New password is required';
        } else if (passwordData.new_password.length < 8) {
            newErrors.new_password = 'Password must be at least 8 characters';
        }

        if (!passwordData.new_password_confirmation) {
            newErrors.new_password_confirmation = 'Password confirmation is required';
        } else if (passwordData.new_password !== passwordData.new_password_confirmation) {
            newErrors.new_password_confirmation = 'Passwords do not match';
        }

        setPasswordErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error for this field when user starts typing
        if (passwordErrors[name]) {
            setPasswordErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (!validatePasswordForm()) {
            return;
        }

        setPasswordLoading(true);
        setPasswordSuccess(false);

        try {
            await apiInstance.put('/user/password', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password,
                new_password_confirmation: passwordData.new_password_confirmation
            });

            setPasswordSuccess(true);
            setPasswordData({
                current_password: '',
                new_password: '',
                new_password_confirmation: ''
            });
            setShowPassword(false);

            // Clear success message after 3 seconds
            setTimeout(() => setPasswordSuccess(false), 3000);

            console.log('Password updated successfully');
        } catch (error) {
            console.error('Password update error:', error);

            if (error.response?.data?.errors) {
                setPasswordErrors(error.response.data.errors);
            } else if (error.response?.data?.message) {
                setPasswordErrors({ general: error.response.data.message });
            } else {
                setPasswordErrors({ general: 'Failed to update password. Please try again.' });
            }
        } finally {
            setPasswordLoading(false);
        }
    };

    const getFieldValidationClass = (fieldName) => {
        if (errors[fieldName]) {
            return 'is-invalid';
        }
        return '';
    };

    return (
        <div className="row justify-content-center">
            <div className="col-lg-8">
                        {/* Profile Section */}
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-primary text-white py-3">
                                <h4 className="mb-0">
                                    <i className="bi bi-person-circle me-2"></i>
                                    Your Profile
                                </h4>
                            </div>
                            <div className="card-body p-4">
                                {success && (
                                    <div className="alert alert-success alert-dismissible fade show" role="alert">
                                        <i className="bi bi-check-circle me-2"></i>
                                        Profile updated successfully!
                                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>
                                )}

                                {errors.general && (
                                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                        <i className="bi bi-exclamation-circle me-2"></i>
                                        {errors.general}
                                        {errors.general.includes('404') && (
                                            <div className="mt-2 small">
                                                <p className="mb-1"><strong>Backend Setup Required:</strong></p>
                                                <p className="mb-0">The backend needs to implement a PATCH/PUT endpoint for <code>/user/profile</code>. Contact your backend developer to add this endpoint.</p>
                                            </div>
                                        )}
                                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit}>
                                    {/* Name Field */}
                                    <div className="mb-3">
                                        <label htmlFor="name" className="form-label fw-semibold">
                                            Full Name <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            className={`form-control ${getFieldValidationClass('name')}`}
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            placeholder="Enter your full name"
                                            disabled={loading}
                                        />
                                        {errors.name && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {errors.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Email Field */}
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label fw-semibold">
                                            Email Address <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            className={`form-control ${getFieldValidationClass('email')}`}
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            placeholder="Enter your email address"
                                            disabled={loading}
                                        />
                                        {errors.email && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {errors.email}
                                            </div>
                                        )}
                                    </div>

                                    {/* Company Field */}
                                    <div className="mb-4">
                                        <label htmlFor="company" className="form-label fw-semibold">
                                            Company <span className="text-muted">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="company"
                                            name="company"
                                            className={`form-control ${getFieldValidationClass('company')}`}
                                            value={formData.company}
                                            onChange={handleInputChange}
                                            placeholder="Enter your company name"
                                            maxLength="255"
                                            disabled={loading}
                                        />
                                        <small className="text-muted d-block mt-1">
                                            {formData.company.length}/255 characters
                                        </small>
                                        {errors.company && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {errors.company}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="d-flex gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status">
                                                        <span className="visually-hidden">Updating...</span>
                                                    </span>
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check2 me-2"></i>
                                                    Save Changes
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-secondary"
                                            onClick={() => navigate('/dashboard')}
                                            disabled={loading}
                                        >
                                            <i className="bi bi-x-lg me-2"></i>
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Password Change Section */}
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-primary text-white py-3">
                                <h4 className="mb-0">
                                    <i className="bi bi-lock me-2"></i>
                                    Change Password
                                </h4>
                            </div>
                            <div className="card-body p-4">
                                {passwordSuccess && (
                                    <div className="alert alert-success alert-dismissible fade show" role="alert">
                                        <i className="bi bi-check-circle me-2"></i>
                                        Password updated successfully!
                                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>
                                )}

                                {passwordErrors.general && (
                                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                                        <i className="bi bi-exclamation-circle me-2"></i>
                                        {passwordErrors.general}
                                        <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                                    </div>
                                )}

                                <form onSubmit={handlePasswordSubmit}>
                                    {/* Current Password Field */}
                                    <div className="mb-3">
                                        <label htmlFor="current_password" className="form-label fw-semibold">
                                            Current Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                id="current_password"
                                                name="current_password"
                                                className={`form-control ${getFieldValidationClass('current_password')}`}
                                                value={passwordData.current_password}
                                                onChange={handlePasswordChange}
                                                placeholder="Enter your current password"
                                                disabled={passwordLoading}
                                            />
                                            <button
                                                className="btn btn-outline-secondary"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                disabled={passwordLoading}
                                            >
                                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                                            </button>
                                        </div>
                                        {passwordErrors.current_password && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {passwordErrors.current_password}
                                            </div>
                                        )}
                                    </div>

                                    {/* New Password Field */}
                                    <div className="mb-3">
                                        <label htmlFor="new_password" className="form-label fw-semibold">
                                            New Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                id="new_password"
                                                name="new_password"
                                                className={`form-control ${getFieldValidationClass('new_password')}`}
                                                value={passwordData.new_password}
                                                onChange={handlePasswordChange}
                                                placeholder="Enter your new password"
                                                disabled={passwordLoading}
                                            />
                                            <button
                                                className="btn btn-outline-secondary"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                disabled={passwordLoading}
                                            >
                                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                                            </button>
                                        </div>
                                        <small className="text-muted d-block mt-1">
                                            Password must be at least 8 characters long
                                        </small>
                                        {passwordErrors.new_password && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {passwordErrors.new_password}
                                            </div>
                                        )}
                                    </div>

                                    {/* Confirm Password Field */}
                                    <div className="mb-4">
                                        <label htmlFor="new_password_confirmation" className="form-label fw-semibold">
                                            Confirm New Password <span className="text-danger">*</span>
                                        </label>
                                        <div className="input-group">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                id="new_password_confirmation"
                                                name="new_password_confirmation"
                                                className={`form-control ${getFieldValidationClass('new_password_confirmation')}`}
                                                value={passwordData.new_password_confirmation}
                                                onChange={handlePasswordChange}
                                                placeholder="Confirm your new password"
                                                disabled={passwordLoading}
                                            />
                                            <button
                                                className="btn btn-outline-secondary"
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                disabled={passwordLoading}
                                            >
                                                <i className={`bi bi-eye${showPassword ? '-slash' : ''}`}></i>
                                            </button>
                                        </div>
                                        {passwordErrors.new_password_confirmation && (
                                            <div className="invalid-feedback d-block">
                                                <i className="bi bi-exclamation-circle me-1"></i>
                                                {passwordErrors.new_password_confirmation}
                                            </div>
                                        )}
                                    </div>

                                    {/* Submit Button */}
                                    <div className="d-flex gap-2">
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={passwordLoading}
                                        >
                                            {passwordLoading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status">
                                                        <span className="visually-hidden">Updating...</span>
                                                    </span>
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check2 me-2"></i>
                                                    Update Password
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
    );
};

export default ProfilePage;
