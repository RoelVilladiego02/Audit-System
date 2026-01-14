import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

const Home = () => {
    const { user, isAdmin } = useAuth();

    return (
        <div className="min-vh-100 bg-light">
            {/* Hero Section */}
            <section className="py-5 bg-white border-bottom">
                <div className="container py-4">
                    <div className="row align-items-center">
                        <div className="col-lg-6 mb-4 mb-lg-0">
                            <div className="mb-4">
                                <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-semibold mb-3">
                                    <i className="bi bi-shield-check me-2"></i>
                                    Enterprise Security Platform
                                </span>
                            </div>
                            <h1 className="display-4 fw-bold text-dark mb-3">
                                IT Security Audit System
                            </h1>
                            <p className="lead text-muted mb-4">
                                A comprehensive platform to assess and enhance your organization's cybersecurity posture with industry-leading tools and insights.
                            </p>

                            {user ? (
                                <div className="d-flex flex-column flex-sm-row gap-3">
                                    <Link to="/admin/questions" className="btn btn-primary btn-lg px-4 py-3 fw-semibold shadow-sm">
                                        <i className="bi bi-clipboard-check me-2"></i>
                                        View Audit Questions
                                    </Link>
                                    <Link to="/admin/submissions" className="btn btn-outline-primary btn-lg px-4 py-3 fw-semibold">
                                        <i className="bi bi-file-earmark-text me-2"></i>
                                        View Submissions
                                    </Link>
                                    {isAdmin && (
                                        <Link to="/admin" className="btn btn-dark btn-lg px-4 py-3 fw-semibold shadow-sm">
                                            <i className="bi bi-speedometer2 me-2"></i>
                                            Admin Dashboard
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <div className="d-flex flex-column flex-sm-row gap-3">
                                    <Link to="/login" className="btn btn-primary btn-lg px-4 py-3 fw-semibold shadow-sm">
                                        <i className="bi bi-box-arrow-in-right me-2"></i>
                                        Sign In
                                    </Link>
                                    <Link to="/register" className="btn btn-outline-primary btn-lg px-4 py-3 fw-semibold">
                                        <i className="bi bi-person-plus me-2"></i>
                                        Create Account
                                    </Link>
                                </div>
                            )}
                        </div>

                        <div className="col-lg-6">
                            <div className="position-relative">
                                <div className="bg-primary bg-opacity-10 rounded-4 p-5 text-center">
                                    <i className="bi bi-shield-lock text-primary" style={{ fontSize: '8rem', opacity: 0.8 }}></i>
                                    <div className="mt-3">
                                        <div className="d-flex justify-content-center gap-2 mb-2">
                                            <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 fw-semibold">
                                                <i className="bi bi-check-circle me-1"></i>
                                                Secure
                                            </span>
                                            <span className="badge bg-info bg-opacity-10 text-info px-3 py-2 fw-semibold">
                                                <i className="bi bi-graph-up me-1"></i>
                                                Reliable
                                            </span>
                                            <span className="badge bg-warning bg-opacity-10 text-warning px-3 py-2 fw-semibold">
                                                <i className="bi bi-lightning me-1"></i>
                                                Fast
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-4 bg-primary text-white">
                <div className="container">
                    <div className="row text-center g-4">
                        <div className="col-md-4">
                            <div className="p-3">
                                <h3 className="display-5 fw-bold mb-1">500+</h3>
                                <p className="mb-0 opacity-90">Security Assessments</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="p-3 border-start border-end border-white border-opacity-25">
                                <h3 className="display-5 fw-bold mb-1">99.9%</h3>
                                <p className="mb-0 opacity-90">Uptime Guarantee</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="p-3">
                                <h3 className="display-5 fw-bold mb-1">24/7</h3>
                                <p className="mb-0 opacity-90">Support Available</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-5">
                <div className="container py-4">
                    <div className="text-center mb-5">
                        <h2 className="display-6 fw-bold text-dark mb-3">
                            Comprehensive Security Solutions
                        </h2>
                        <p className="lead text-muted col-lg-8 mx-auto">
                            Everything you need to assess, monitor, and improve your organization's security posture
                        </p>
                    </div>

                    <div className="row g-4">
                        <div className="col-lg-4 col-md-6">
                            <div className="card border-0 shadow-sm h-100 hover-lift">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start mb-3">
                                        <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3 me-3">
                                            <i className="bi bi-shield-check" style={{ fontSize: '1.75rem' }}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h5 className="card-title fw-bold mb-2">Comprehensive Assessment</h5>
                                            <p className="card-text text-muted mb-0">
                                                Conduct thorough security evaluations aligned with industry standards and best practices.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4 col-md-6">
                            <div className="card border-0 shadow-sm h-100 hover-lift">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start mb-3">
                                        <div className="bg-success bg-opacity-10 text-success rounded-3 p-3 me-3">
                                            <i className="bi bi-bar-chart-line" style={{ fontSize: '1.75rem' }}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h5 className="card-title fw-bold mb-2">Detailed Analytics</h5>
                                            <p className="card-text text-muted mb-0">
                                                Gain visual insights and track security trends over time for informed decision-making.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4 col-md-6">
                            <div className="card border-0 shadow-sm h-100 hover-lift">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start mb-3">
                                        <div className="bg-warning bg-opacity-10 text-warning rounded-3 p-3 me-3">
                                            <i className="bi bi-lightbulb" style={{ fontSize: '1.75rem' }}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h5 className="card-title fw-bold mb-2">Actionable Insights</h5>
                                            <p className="card-text text-muted mb-0">
                                                Receive clear, prioritized recommendations to strengthen your security measures.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4 col-md-6">
                            <div className="card border-0 shadow-sm h-100 hover-lift">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start mb-3">
                                        <div className="bg-info bg-opacity-10 text-info rounded-3 p-3 me-3">
                                            <i className="bi bi-file-earmark-lock" style={{ fontSize: '1.75rem' }}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h5 className="card-title fw-bold mb-2">Compliance Ready</h5>
                                            <p className="card-text text-muted mb-0">
                                                Meet regulatory requirements with automated compliance tracking and reporting.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4 col-md-6">
                            <div className="card border-0 shadow-sm h-100 hover-lift">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start mb-3">
                                        <div className="bg-danger bg-opacity-10 text-danger rounded-3 p-3 me-3">
                                            <i className="bi bi-exclamation-triangle" style={{ fontSize: '1.75rem' }}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h5 className="card-title fw-bold mb-2">Risk Management</h5>
                                            <p className="card-text text-muted mb-0">
                                                Identify, assess, and mitigate potential security risks before they become threats.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-4 col-md-6">
                            <div className="card border-0 shadow-sm h-100 hover-lift">
                                <div className="card-body p-4">
                                    <div className="d-flex align-items-start mb-3">
                                        <div className="bg-primary bg-opacity-10 text-primary rounded-3 p-3 me-3">
                                            <i className="bi bi-people" style={{ fontSize: '1.75rem' }}></i>
                                        </div>
                                        <div className="flex-grow-1">
                                            <h5 className="card-title fw-bold mb-2">Team Collaboration</h5>
                                            <p className="card-text text-muted mb-0">
                                                Work together seamlessly with role-based access and real-time updates.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            {!user && (
                <section className="py-5 bg-white border-top">
                    <div className="container py-4">
                        <div className="card border-0 shadow-lg bg-primary text-white overflow-hidden">
                            <div className="card-body p-5 text-center">
                                <h2 className="display-6 fw-bold mb-3">
                                    Ready to Secure Your Organization?
                                </h2>
                                <p className="lead mb-4 opacity-90">
                                    Join hundreds of organizations protecting their digital assets
                                </p>
                                <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                    <Link to="/register" className="btn btn-light btn-lg px-5 py-3 fw-semibold shadow">
                                        <i className="bi bi-person-plus me-2"></i>
                                        Get Started Free
                                    </Link>
                                    <Link to="/login" className="btn btn-outline-light btn-lg px-5 py-3 fw-semibold">
                                        <i className="bi bi-box-arrow-in-right me-2"></i>
                                        Sign In
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <style jsx>{`
                .hover-lift {
                    transition: all 0.3s ease;
                }
                .hover-lift:hover {
                    transform: translateY(-5px);
                    box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.15) !important;
                }
            `}</style>
        </div>
    );
};

export default Home;