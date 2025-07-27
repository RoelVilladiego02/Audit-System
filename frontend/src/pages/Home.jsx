import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const Home = () => {
    const { user, isAdmin } = useAuth();

    return (
        <div className="min-vh-100 bg-light">
            <div className="container py-5">
                <div className="text-center mb-5">
                    <h1 className="display-4 fw-bold">Security Audit System</h1>
                    <p className="lead text-muted">
                        Comprehensive security assessment platform for evaluating and improving your organization's security posture.
                    </p>

                    {user ? (
                        <div className="mt-4">
                            <h2 className="h4 fw-semibold mb-3">Welcome back, {user.name}!</h2>
                            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                <Link to="/audit" className="btn btn-primary px-4 py-2">
                                    Start New Audit
                                </Link>
                                <Link to="/submissions" className="btn btn-outline-primary px-4 py-2">
                                    View Submissions
                                </Link>
                                {isAdmin && (
                                    <Link to="/admin" className="btn btn-dark px-4 py-2">
                                        Admin Dashboard
                                    </Link>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 d-flex flex-column flex-sm-row justify-content-center gap-3">
                            <Link to="/login" className="btn btn-primary px-4 py-2">
                                Sign In
                            </Link>
                            <Link to="/register" className="btn btn-outline-primary px-4 py-2">
                                Register
                            </Link>
                        </div>
                    )}
                </div>

                {/* Feature Section */}
                <div className="row g-4">
                    <div className="col-md-4">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body d-flex">
                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: 50, height: 50 }}>
                                    <i className="bi bi-shield-check fs-4"></i>
                                </div>
                                <div>
                                    <h5 className="card-title">Comprehensive Assessment</h5>
                                    <p className="card-text text-muted">
                                        Thorough security evaluation based on industry standards and best practices.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body d-flex">
                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: 50, height: 50 }}>
                                    <i className="bi bi-bar-chart-line fs-4"></i>
                                </div>
                                <div>
                                    <h5 className="card-title">Detailed Analytics</h5>
                                    <p className="card-text text-muted">
                                        Visual insights and trends analysis of your security posture over time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-md-4">
                        <div className="card h-100 shadow-sm">
                            <div className="card-body d-flex">
                                <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: 50, height: 50 }}>
                                    <i className="bi bi-lightbulb fs-4"></i>
                                </div>
                                <div>
                                    <h5 className="card-title">Actionable Insights</h5>
                                    <p className="card-text text-muted">
                                        Clear recommendations and steps to improve your security measures.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
