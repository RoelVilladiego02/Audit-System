import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const Home = () => {
    const { user, isAdmin } = useAuth();

    return (
        <div className="min-vh-100 bg-light">
            {/* Hero Section */}
            <section className="py-5 py-md-7 bg-white">
                <div className="container">
                    <div className="text-center">
                        <h1 className="display-3 fw-bold mb-3">IT Security Audit System</h1>
                        <p className="lead text-muted mb-5 col-md-8 mx-auto">
                            A comprehensive platform to assess and enhance your organization's cybersecurity posture with industry-leading tools and insights.
                        </p>

                        {user ? (
                            <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
                                <Link to="/admin/questions" className="btn btn-primary btn-lg px-4 py-2">
                                    View Audit Questions
                                </Link>
                                <Link to="/admin/submissions" className="btn btn-outline-primary btn-lg px-4 py-2">
                                    View Submissions
                                </Link>
                                {isAdmin && (
                                    <Link to="/admin" className="btn btn-dark btn-lg px-4 py-2">
                                        Admin Dashboard
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
                                <Link to="/login" className="btn btn-primary btn-lg px-4 py-2">
                                    Sign In
                                </Link>
                                <Link to="/register" className="btn btn-outline-primary btn-lg px-4 py-2">
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Feature Section */}
            <section className="py-5">
                <div className="container">
                    <div className="row g-4">
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm h-100 transition-all duration-300 hover:shadow-lg">
                                <div className="card-body d-flex align-items-start">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-3" style={{ width: 48, height: 48 }}>
                                        <svg className="bi" width="24" height="24" fill="currentColor">
                                            <use xlinkHref="/bootstrap-icons.svg#shield-check" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h5 className="card-title fw-bold mb-2">Comprehensive Assessment</h5>
                                        <p className="card-text text-muted">
                                            Conduct thorough security evaluations aligned with industry standards and best practices.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm h-100 transition-all duration-300 hover:shadow-lg">
                                <div className="card-body d-flex align-items-start">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-3" style={{ width: 48, height: 48 }}>
                                        <svg className="bi" width="24" height="24" fill="currentColor">
                                            <use xlinkHref="/bootstrap-icons.svg#bar-chart-line" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h5 className="card-title fw-bold mb-2">Detailed Analytics</h5>
                                        <p className="card-text text-muted">
                                            Gain visual insights and track security trends over time for informed decision-making.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm h-100 transition-all duration-300 hover:shadow-lg">
                                <div className="card-body d-flex align-items-start">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-3" style={{ width: 48, height: 48 }}>
                                        <svg className="bi" width="24" height="24" fill="currentColor">
                                            <use xlinkHref="/bootstrap-icons.svg#lightbulb" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h5 className="card-title fw-bold mb-2">Actionable Insights</h5>
                                        <p className="card-text text-muted">
                                            Receive clear, prioritized recommendations to strengthen your security measures.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;