import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

const UserDashboard = () => {
    const { user } = useAuth();

    return (
        <div className="min-vh-100 bg-light">
            {/* Header Section */}
            <section className="py-5 bg-white">
                <div className="container">
                    <div className="text-center">
                        <h1 className="display-4 fw-bold mb-3">Welcome, {user?.name}</h1>
                        <p className="lead text-muted col-md-8 mx-auto">
                            Manage your security audits, review submissions, and gain insights to strengthen your organization's security posture.
                        </p>
                    </div>
                </div>
            </section>

            {/* Action Cards */}
            <section className="py-5">
                <div className="container">
                    <div className="row g-4">
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm h-100 transition-all duration-300 hover:shadow-lg">
                                <div className="card-body d-flex align-items-start">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-3" style={{ width: 48, height: 48 }}>
                                        <svg className="bi" width="24" height="24" fill="currentColor">
                                            <use xlinkHref="/bootstrap-icons.svg#file-earmark-plus" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h5 className="card-title fw-bold mb-2">Start New Audit</h5>
                                        <p className="card-text text-muted mb-3">
                                            Begin a new security audit with our comprehensive questionnaire.
                                        </p>
                                        <Link to="/audit" className="btn btn-primary px-4">
                                            Start Audit
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card border-0 shadow-sm h-100 transition-all duration-300 hover:shadow-lg">
                                <div className="card-body d-flex align-items-start">
                                    <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 me-3" style={{ width: 48, height: 48 }}>
                                        <svg className="bi" width="24" height="24" fill="currentColor">
                                            <use xlinkHref="/bootstrap-icons.svg#list-check" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h5 className="card-title fw-bold mb-2">View Submissions</h5>
                                        <p className="card-text text-muted mb-3">
                                            Review your previous audit submissions and track their status.
                                        </p>
                                        <Link to="/submissions" className="btn btn-primary px-4">
                                            View Submissions
                                        </Link>
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
                                        <h5 className="card-title fw-bold mb-2">Analytics</h5>
                                        <p className="card-text text-muted mb-3">
                                            Explore insights and trends from your audit submissions.
                                        </p>
                                        <Link to="/analytics" className="btn btn-primary px-4">
                                            View Analytics
                                        </Link>
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

export default UserDashboard;