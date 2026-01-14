import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="min-vh-100 d-flex align-items-center bg-light py-5">
            <div className="container">
                <div className="row justify-content-center">
                    <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
                        <div className="card border-0 shadow-lg">
                            <div className="card-body p-5 text-center">
                                {/* Icon */}
                                <div className="mb-4">
                                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '120px', height: '120px' }}>
                                        <i className="bi bi-compass text-primary" style={{ fontSize: '3.5rem' }}></i>
                                    </div>
                                </div>

                                {/* 404 Number */}
                                <div className="mb-3">
                                    <h1 className="display-1 fw-bold text-primary mb-0">404</h1>
                                </div>

                                {/* Title */}
                                <h2 className="h3 fw-bold text-dark mb-3">
                                    Page Not Found
                                </h2>

                                {/* Description */}
                                <p className="text-muted mb-4 lead">
                                    The page you're looking for doesn't exist or has been moved to a different location.
                                </p>

                                {/* Suggestions */}
                                <div className="alert alert-light border mb-4 text-start">
                                    <p className="mb-2 fw-semibold text-dark small">
                                        <i className="bi bi-lightbulb text-warning me-2"></i>
                                        Here's what you can do:
                                    </p>
                                    <ul className="mb-0 ps-4 small text-muted">
                                        <li className="mb-1">Check if the URL is spelled correctly</li>
                                        <li className="mb-1">Return to the homepage and start again</li>
                                        <li>Contact support if you believe this is an error</li>
                                    </ul>
                                </div>

                                {/* Actions */}
                                <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
                                    <Link
                                        to="/"
                                        className="btn btn-primary btn-lg px-4 py-3 fw-semibold shadow-sm"
                                    >
                                        <i className="bi bi-house-door me-2"></i>
                                        Return Home
                                    </Link>
                                    <button
                                        onClick={() => window.history.back()}
                                        className="btn btn-outline-primary btn-lg px-4 py-3 fw-semibold"
                                    >
                                        <i className="bi bi-arrow-left me-2"></i>
                                        Go Back
                                    </button>
                                </div>

                                {/* Additional Info */}
                                <div className="mt-5 pt-4 border-top">
                                    <p className="text-muted mb-0 small">
                                        <i className="bi bi-shield-check me-1"></i>
                                        Need help? Contact our support team
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="mt-4 text-center">
                            <p className="text-muted mb-2 small fw-semibold">Quick Links</p>
                            <div className="d-flex justify-content-center gap-3 flex-wrap">
                                <Link to="/login" className="text-primary text-decoration-none small">
                                    <i className="bi bi-box-arrow-in-right me-1"></i>
                                    Sign In
                                </Link>
                                <span className="text-muted">•</span>
                                <Link to="/register" className="text-primary text-decoration-none small">
                                    <i className="bi bi-person-plus me-1"></i>
                                    Register
                                </Link>
                                <span className="text-muted">•</span>
                                <Link to="/admin/questions" className="text-primary text-decoration-none small">
                                    <i className="bi bi-clipboard-check me-1"></i>
                                    Audit Questions
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;