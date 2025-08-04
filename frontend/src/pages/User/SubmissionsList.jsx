import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import api from '../../api/axios';

const getRiskLevelBadge = (level) => {
    const badges = {
        high: 'bg-danger',
        medium: 'bg-warning text-dark',
        low: 'bg-success'
    };
    return badges[level?.toLowerCase()] || 'bg-secondary';
};

const getRiskIcon = (level) => {
    const icons = {
        high: 'bi-circle-fill text-danger',
        medium: 'bi-circle-fill text-warning',
        low: 'bi-circle-fill text-success'
    };
    return icons[level?.toLowerCase()] || 'bi-circle-fill text-muted';
};

const getStatusBadge = (status) => {
    const badges = {
        submitted: 'bg-info',
        under_review: 'bg-warning text-dark',
        completed: 'bg-success',
        pending: 'bg-secondary'
    };
    return badges[status] || 'bg-secondary';
};

const getStatusIcon = (status) => {
    const icons = {
        submitted: 'bi-clock-history',
        under_review: 'bi-eye',
        completed: 'bi-check-circle-fill',
        pending: 'bi-hourglass-split'
    };
    return icons[status] || 'bi-question-circle';
};

const SubmissionsList = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('newest');
    const [filterBy, setFilterBy] = useState('all');

    const fetchSubmissions = React.useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('Auth State:', {
                token: token ? 'Present' : 'Missing',
                user: localStorage.getItem('user'),
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await api.get('/audit-submissions');
            const transformedSubmissions = response.data.map(submission => ({
                ...submission,
                overall_risk: submission.effective_overall_risk || submission.admin_overall_risk || submission.system_overall_risk || 'low'
            }));
            setSubmissions(transformedSubmissions);
            setError(null);
        } catch (err) {
            console.error('Error fetching submissions:', err);
            if (err.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                navigate('/login', {
                    state: { 
                        from: '/submissions',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
                return;
            }
            setError('Failed to load submissions. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (!user) {
            navigate('/login', { 
                state: { 
                    from: '/submissions',
                    message: 'Please log in to view your submissions.' 
                }
            });
            return;
        }
        fetchSubmissions();
    }, [user, navigate, fetchSubmissions]);

    const getSortedAndFilteredSubmissions = () => {
        let filtered = submissions;
        if (filterBy !== 'all') {
            if (filterBy === 'high_risk') {
                filtered = submissions.filter(s => s.overall_risk === 'high');
            } else if (filterBy === 'completed') {
                filtered = submissions.filter(s => s.status === 'completed');
            } else if (filterBy === 'pending') {
                filtered = submissions.filter(s => s.status !== 'completed');
            }
        }
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'risk_high':
                    const riskOrder = { high: 3, medium: 2, low: 1 };
                    return riskOrder[b.overall_risk] - riskOrder[a.overall_risk];
                case 'risk_low':
                    const riskOrderLow = { high: 1, medium: 2, low: 3 };
                    return riskOrderLow[b.overall_risk] - riskOrderLow[a.overall_risk];
                default:
                    return 0;
            }
        });
    };

    const getTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="container-fluid min-vh-100 bg-light d-flex justify-content-center align-items-center">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="fw-bold text-muted">Loading Your Audit Submissions...</h5>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid min-vh-100 bg-light py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-0 py-3">
                                <h5 className="fw-bold text-danger mb-0">Error</h5>
                            </div>
                            <div className="card-body text-center py-4">
                                <i className="bi bi-exclamation-triangle-fill text-danger mb-3" style={{ fontSize: '2rem' }} aria-hidden="true"></i>
                                <p className="text-muted mb-4">{error}</p>
                                <div className="d-flex justify-content-center gap-3">
                                    <button onClick={fetchSubmissions} className="btn btn-sm btn-primary" aria-label="Retry loading submissions">
                                        <i className="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
                                        Try Again
                                    </button>
                                    <Link to="/audit" className="btn btn-sm btn-outline-primary" aria-label="Start new audit">
                                        <i className="bi bi-plus-circle me-2" aria-hidden="true"></i>
                                        New Audit
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const filteredSubmissions = getSortedAndFilteredSubmissions();
    const stats = {
        total: submissions.length,
        high: submissions.filter(s => s.overall_risk === 'high').length,
        medium: submissions.filter(s => s.overall_risk === 'medium').length,
        low: submissions.filter(s => s.overall_risk === 'low').length,
        completed: submissions.filter(s => s.status === 'completed').length,
        pending: submissions.filter(s => s.status !== 'completed').length
    };

    return (
        <div className="container-fluid min-vh-100 bg-light py-4">
            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-9">
                    {/* Header Section */}
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white border-0 py-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <h3 className="fw-bold text-primary mb-0">
                                    <i className="bi bi-clipboard-data me-2" aria-hidden="true"></i>
                                    My Security Audits
                                </h3>
                                <Link to="/audit" className="btn btn-sm btn-primary" aria-label="Start new assessment">
                                    <i className="bi bi-plus-circle me-2" aria-hidden="true"></i>
                                    New Assessment
                                </Link>
                            </div>
                        </div>
                        <div className="card-body py-3">
                            <p className="text-muted small mb-0">Track and manage your security assessment history</p>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    {submissions.length > 0 && (
                        <div className="row mb-4">
                            <div className="col-md-3 mb-3">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body text-center">
                                        <div className="bg-primary bg-opacity-10 rounded-circle p-3 mb-2 d-inline-flex">
                                            <i className="bi bi-clipboard-data text-primary" style={{ fontSize: '1.5rem' }} aria-hidden="true"></i>
                                        </div>
                                        <h4 className="fw-bold text-primary mb-1">{stats.total}</h4>
                                        <p className="text-muted small fw-semibold mb-0">Total Submissions</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3 mb-3">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body text-center">
                                        <div className="bg-danger bg-opacity-10 rounded-circle p-3 mb-2 d-inline-flex">
                                            <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '1.5rem' }} aria-hidden="true"></i>
                                        </div>
                                        <h4 className="fw-bold text-danger mb-1">{stats.high}</h4>
                                        <p className="text-muted small fw-semibold mb-0">High Risk</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3 mb-3">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body text-center">
                                        <div className="bg-success bg-opacity-10 rounded-circle p-3 mb-2 d-inline-flex">
                                            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '1.5rem' }} aria-hidden="true"></i>
                                        </div>
                                        <h4 className="fw-bold text-success mb-1">{stats.completed}</h4>
                                        <p className="text-muted small fw-semibold mb-0">Completed Reviews</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3 mb-3">
                                <div className="card border-0 shadow-sm h-100">
                                    <div className="card-body text-center">
                                        <div className="bg-warning bg-opacity-10 rounded-circle p-3 mb-2 d-inline-flex">
                                            <i className="bi bi-hourglass-split text-warning" style={{ fontSize: '1.5rem' }} aria-hidden="true"></i>
                                        </div>
                                        <h4 className="fw-bold text-warning mb-1">{stats.pending}</h4>
                                        <p className="text-muted small fw-semibold mb-0">Pending Review</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Filters and Sorting */}
                    {submissions.length > 0 && (
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-white border-0 py-3">
                                <h5 className="fw-bold mb-0">Filter & Sort</h5>
                            </div>
                            <div className="card-body py-3">
                                <div className="row align-items-center">
                                    <div className="col-md-6 mb-3 mb-md-0">
                                        <div className="d-flex align-items-center">
                                            <label className="form-label fw-semibold text-muted me-3 mb-0" htmlFor="filter-select">Filter:</label>
                                            <select 
                                                id="filter-select"
                                                className="form-select form-select-sm w-auto"
                                                value={filterBy}
                                                onChange={(e) => setFilterBy(e.target.value)}
                                                aria-label="Filter submissions"
                                            >
                                                <option value="all">All Submissions</option>
                                                <option value="high_risk">High Risk Only</option>
                                                <option value="completed">Completed Reviews</option>
                                                <option value="pending">Pending Review</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center justify-content-md-end">
                                            <label className="form-label fw-semibold text-muted me-3 mb-0" htmlFor="sort-select">Sort by:</label>
                                            <select 
                                                id="sort-select"
                                                className="form-select form-select-sm w-auto"
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                aria-label="Sort submissions"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="oldest">Oldest First</option>
                                                <option value="risk_high">Highest Risk First</option>
                                                <option value="risk_low">Lowest Risk First</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Submissions List */}
                    {submissions.length === 0 ? (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-0 py-3">
                                <h5 className="fw-bold mb-0">No Submissions</h5>
                            </div>
                            <div className="card-body text-center py-4">
                                <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-4 mb-3">
                                    <i className="bi bi-clipboard-data text-primary" style={{ fontSize: '2rem' }} aria-hidden="true"></i>
                                </div>
                                <h4 className="fw-bold text-muted mb-3">No Security Audits Yet</h4>
                                <p className="text-muted mb-4 col-md-6 mx-auto">
                                    Start your first security assessment to identify potential vulnerabilities and improve your organization's security posture.
                                </p>
                                <Link to="/audit" className="btn btn-sm btn-primary" aria-label="Start first assessment">
                                    <i className="bi bi-plus-circle me-2" aria-hidden="true"></i>
                                    Start Your First Assessment
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-0 py-3 d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0">
                                    <i className="bi bi-list-ul me-2 text-primary" aria-hidden="true"></i>
                                    Assessment History
                                </h5>
                                <span className="badge bg-primary">{filteredSubmissions.length} Result{filteredSubmissions.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="card-body p-0">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th scope="col" className="py-3" style={{ width: '5%' }}></th>
                                            <th scope="col" className="py-3 fw-semibold text-muted">Title</th>
                                            <th scope="col" className="py-3 fw-semibold text-muted">Status</th>
                                            <th scope="col" className="py-3 fw-semibold text-muted">Risk Level</th>
                                            <th scope="col" className="py-3 fw-semibold text-muted">Progress</th>
                                            <th scope="col" className="py-3 fw-semibold text-muted">Submitted</th>
                                            <th scope="col" className="py-3 fw-semibold text-muted">By</th>
                                            <th scope="col" className="py-3" style={{ width: '5%' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSubmissions.map((submission) => (
                                            <tr key={submission.id}>
                                                <td className="py-3">
                                                    <i className={getRiskIcon(submission.overall_risk || 'low')} aria-hidden="true"></i>
                                                </td>
                                                <td className="py-3">
                                                    <Link 
                                                        to={`/submissions/${submission.id}`}
                                                        className="text-decoration-none text-dark fw-semibold"
                                                        aria-label={`View submission ${submission.title || `Security Assessment #${submission.id}`}`}
                                                    >
                                                        {submission.title || `Security Assessment #${submission.id}`}
                                                    </Link>
                                                </td>
                                                <td className="py-3">
                                                    <span className={`badge ${getStatusBadge(submission.status)}`}>
                                                        <i className={`bi ${getStatusIcon(submission.status)} me-1`} aria-hidden="true"></i>
                                                        {submission.status?.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    <span className={`badge ${getRiskLevelBadge(submission.overall_risk || 'low')}`}>
                                                        {(submission.overall_risk || 'low').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    {submission.review_progress && submission.status !== 'completed' && (
                                                        <span className="badge bg-info">{submission.review_progress}%</span>
                                                    )}
                                                </td>
                                                <td className="py-3 text-muted small">
                                                    {new Date(submission.created_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                    <span className="ms-1">({getTimeAgo(submission.created_at)})</span>
                                                </td>
                                                <td className="py-3 text-muted small">{submission.user?.name || 'Unknown'}</td>
                                                <td className="py-3">
                                                    <Link 
                                                        to={`/submissions/${submission.id}`}
                                                        className="text-muted"
                                                        aria-label={`View submission ${submission.title || `Security Assessment #${submission.id}`}`}
                                                    >
                                                        <i className="bi bi-chevron-right" aria-hidden="true"></i>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Footer Info */}
                    {submissions.length > 0 && (
                        <div className="card border-0 shadow-sm bg-light mt-4">
                            <div className="card-body py-3">
                                <div className="row text-center text-muted small">
                                    <div className="col-md-4 mb-3 mb-md-0">
                                        <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
                                        Click any submission for detailed analysis
                                    </div>
                                    <div className="col-md-4 mb-3 mb-md-0">
                                        <i className="bi bi-shield-fill-check me-2" aria-hidden="true"></i>
                                        Regular assessments improve security
                                    </div>
                                    <div className="col-md-4">
                                        <i className="bi bi-graph-up me-2" aria-hidden="true"></i>
                                        Track your security progress over time
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubmissionsList;