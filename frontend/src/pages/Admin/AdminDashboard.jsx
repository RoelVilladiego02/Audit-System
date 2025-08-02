import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import axios from '../../api/axios';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        pending_reviews: 0,
        under_review: 0,
        completed_today: 0,
        high_risk_submissions: 0,
        pending_answers: 0,
        recent_submissions: [],
    });
    const [questionStats, setQuestionStats] = useState([]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [dashboardResponse, questionStatsResponse] = await Promise.all([
                axios.get('audit-submissions/admin/dashboard'),
                axios.get('audit-questions-statistics'),
            ]);

            setStats(dashboardResponse.data);
            setQuestionStats(questionStatsResponse.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center min-vh-100 bg-light">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted mb-2">Loading Dashboard...</h5>
                    <p className="text-muted small">Please wait while we fetch your data</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-5">
                <h1 className="display-5 fw-bold">Welcome, {user?.name}</h1>
                <Link to="/admin/questions/create" className="btn btn-primary btn-lg">
                    Create New Question
                </Link>
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            )}

            {/* Quick Stats */}
            <div className="row g-4 mb-5">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0 bg-primary rounded-circle p-3 me-3">
                                    <svg className="bi text-white" width="24" height="24" fill="currentColor">
                                        <use xlinkHref="/bootstrap-icons.svg#file-earmark-text" />
                                    </svg>
                                </div>
                                <div>
                                    <h6 className="text-muted mb-1">Pending Reviews</h6>
                                    <h3 className="fw-bold mb-0">{stats.pending_reviews}</h3>
                                </div>
                            </div>
                            <div className="mt-3">
                                <Link to="/admin/submissions?status=pending" className="text-primary small text-decoration-none">
                                    View pending submissions
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0 bg-success rounded-circle p-3 me-3">
                                    <svg className="bi text-white" width="24" height="24" fill="currentColor">
                                        <use xlinkHref="/bootstrap-icons.svg#check-circle" />
                                    </svg>
                                </div>
                                <div>
                                    <h6 className="text-muted mb-1">Under Review</h6>
                                    <h3 className="fw-bold mb-0">{stats.under_review}</h3>
                                </div>
                            </div>
                            <div className="mt-3">
                                <Link to="/admin/submissions?status=under_review" className="text-primary small text-decoration-none">
                                    View submissions under review
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0 bg-danger rounded-circle p-3 me-3">
                                    <svg className="bi text-white" width="24" height="24" fill="currentColor">
                                        <use xlinkHref="/bootstrap-icons.svg#exclamation-triangle" />
                                    </svg>
                                </div>
                                <div>
                                    <h6 className="text-muted mb-1">High Risk Submissions</h6>
                                    <h3 className="fw-bold mb-0">{stats.high_risk_submissions}</h3>
                                </div>
                            </div>
                            <div className="mt-3">
                                <Link to="/analytics" className="text-primary small text-decoration-none">
                                    View risk analysis
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="row g-4 mb-5">
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <h5 className="card-title fw-bold">Manage Questions</h5>
                            <p className="card-text text-muted">Create, edit, and manage audit questions and their categories.</p>
                            <Link to="/admin/questions" className="btn btn-outline-primary">
                                Manage Questions
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                        <div className="card-body">
                            <h5 className="card-title fw-bold">Analytics Dashboard</h5>
                            <p className="card-text text-muted">View detailed analytics and reports for all submissions.</p>
                            <Link to="/analytics" className="btn btn-outline-primary">
                                View Analytics
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Submissions */}
            <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3">
                    <h5 className="mb-0 fw-bold">Recent Submissions</h5>
                    <p className="text-muted small mb-0">Latest security audit submissions from users</p>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="border-0 ps-4">Submission</th>
                                    <th className="border-0">User</th>
                                    <th className="border-0">Status</th>
                                    <th className="border-0">Risk Level</th>
                                    <th className="border-0">Progress</th>
                                    <th className="border-0">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent_submissions.map((submission) => (
                                    <tr key={submission.id}>
                                        <td className="ps-4">
                                            <Link to={`/admin/submissions/${submission.id}`} className="text-primary text-decoration-none">
                                                {submission.title}
                                            </Link>
                                        </td>
                                        <td>{submission.user}</td>
                                        <td>
                                            <span className={`badge ${
                                                submission.status === 'pending' ? 'bg-warning' :
                                                submission.status === 'under_review' ? 'bg-info' :
                                                'bg-success'
                                            } text-white`}>
                                                {submission.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${
                                                submission.effective_overall_risk === 'high' ? 'bg-danger' :
                                                submission.effective_overall_risk === 'medium' ? 'bg-warning' :
                                                submission.effective_overall_risk === 'low' ? 'bg-success' :
                                                'bg-secondary'
                                            } text-white`}>
                                                {submission.effective_overall_risk.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="progress" style={{ height: '8px' }}>
                                                <div
                                                    className="progress-bar bg-primary"
                                                    role="progressbar"
                                                    style={{ width: `${submission.review_progress}%` }}
                                                    aria-valuenow={submission.review_progress}
                                                    aria-valuemin="0"
                                                    aria-valuemax="100"
                                                ></div>
                                            </div>
                                        </td>
                                        <td>{new Date(submission.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Question Statistics */}
            <div className="card border-0 shadow-sm mt-5">
                <div className="card-header bg-white py-3">
                    <h5 className="mb-0 fw-bold">Question Statistics</h5>
                    <p className="text-muted small mb-0">Overview of audit question performance and risk distribution</p>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="border-0 ps-4">Question</th>
                                    <th className="border-0">Category</th>
                                    <th className="border-0">Total Answers</th>
                                    <th className="border-0">High Risk</th>
                                    <th className="border-0">Pending Review</th>
                                </tr>
                            </thead>
                            <tbody>
                                {questionStats.map((question) => (
                                    <tr key={question.id}>
                                        <td className="ps-4">
                                            <Link to={`/admin/questions/${question.id}`} className="text-primary text-decoration-none">
                                                {question.question}
                                            </Link>
                                        </td>
                                        <td>{question.category}</td>
                                        <td>{question.answers_count}</td>
                                        <td>
                                            <span className={`badge ${question.high_risk_count > 0 ? 'bg-danger' : 'bg-success'} text-white`}>
                                                {question.high_risk_count}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge bg-warning text-white">
                                                {question.pending_review_count}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;