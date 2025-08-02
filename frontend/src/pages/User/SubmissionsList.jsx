import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import api from '../../api/axios';

const getRiskLevelBadge = (level) => {
    const badges = {
        high: 'badge bg-danger',
        medium: 'badge bg-warning text-dark',
        low: 'badge bg-success'
    };
    return badges[level?.toLowerCase()] || 'badge bg-secondary';
};

const getRiskIcon = (level) => {
    const icons = {
        high: '🔴',
        medium: '🟡', 
        low: '🟢'
    };
    return icons[level?.toLowerCase()] || '⚪';
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
    }, [user, navigate]);

    const fetchSubmissions = async () => {
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
    };

    const getSortedAndFilteredSubmissions = () => {
        let filtered = submissions;
        
        // Apply filters
        if (filterBy !== 'all') {
            if (filterBy === 'high_risk') {
                filtered = submissions.filter(s => s.overall_risk === 'high');
            } else if (filterBy === 'completed') {
                filtered = submissions.filter(s => s.status === 'completed');
            } else if (filterBy === 'pending') {
                filtered = submissions.filter(s => s.status !== 'completed');
            }
        }
        
        // Apply sorting
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
            <div className="container-fluid py-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <div className="d-flex justify-content-center align-items-center" style={{minHeight: '60vh'}}>
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h5 className="text-muted">Loading your audit submissions...</h5>
                        <p className="text-muted small">This may take a moment</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <div className="card shadow-sm border-0">
                            <div className="card-body text-center py-5">
                                <i className="bi bi-exclamation-triangle text-danger mb-3" style={{ fontSize: '3rem' }}></i>
                                <h5 className="text-danger mb-3">Error Loading Submissions</h5>
                                <p className="text-muted mb-4">{error}</p>
                                <button onClick={fetchSubmissions} className="btn btn-primary me-2">
                                    <i className="bi bi-arrow-clockwise me-2"></i>
                                    Try Again
                                </button>
                                <Link to="/audit" className="btn btn-outline-primary">
                                    <i className="bi bi-plus-circle me-2"></i>
                                    New Audit
                                </Link>
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
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header Section */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card shadow-sm border-0">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h1 className="h2 fw-bold text-primary mb-2">
                                        <i className="bi bi-clipboard-data me-2"></i>
                                        My Security Audits
                                    </h1>
                                    <p className="text-muted mb-0">
                                        Track and manage your security assessment history
                                    </p>
                                </div>
                                <div>
                                    <Link to="/audit" className="btn btn-primary btn-lg shadow-sm">
                                        <i className="bi bi-plus-circle me-2"></i>
                                        New Assessment
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {submissions.length > 0 && (
                <div className="row mb-4">
                    <div className="col-lg-3 col-md-6 mb-3">
                        <div className="card border-0 shadow-sm h-100 bg-white">
                            <div className="card-body text-center">
                                <div className="d-flex justify-content-center align-items-center mb-2">
                                    <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                                        <i className="bi bi-clipboard-data text-primary" style={{ fontSize: '1.5rem' }}></i>
                                    </div>
                                </div>
                                <h3 className="fw-bold text-primary mb-1">{stats.total}</h3>
                                <p className="text-muted small mb-0">Total Submissions</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <div className="card border-0 shadow-sm h-100 bg-white">
                            <div className="card-body text-center">
                                <div className="d-flex justify-content-center align-items-center mb-2">
                                    <div className="bg-danger bg-opacity-10 rounded-circle p-3">
                                        <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '1.5rem' }}></i>
                                    </div>
                                </div>
                                <h3 className="fw-bold text-danger mb-1">{stats.high}</h3>
                                <p className="text-muted small mb-0">High Risk</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <div className="card border-0 shadow-sm h-100 bg-white">
                            <div className="card-body text-center">
                                <div className="d-flex justify-content-center align-items-center mb-2">
                                    <div className="bg-success bg-opacity-10 rounded-circle p-3">
                                        <i className="bi bi-check-circle text-success" style={{ fontSize: '1.5rem' }}></i>
                                    </div>
                                </div>
                                <h3 className="fw-bold text-success mb-1">{stats.completed}</h3>
                                <p className="text-muted small mb-0">Completed Reviews</p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-3 col-md-6 mb-3">
                        <div className="card border-0 shadow-sm h-100 bg-white">
                            <div className="card-body text-center">
                                <div className="d-flex justify-content-center align-items-center mb-2">
                                    <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                                        <i className="bi bi-clock-history text-warning" style={{ fontSize: '1.5rem' }}></i>
                                    </div>
                                </div>
                                <h3 className="fw-bold text-warning mb-1">{stats.pending}</h3>
                                <p className="text-muted small mb-0">Pending Review</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Sorting */}
            {submissions.length > 0 && (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card shadow-sm border-0">
                            <div className="card-body py-3">
                                <div className="row align-items-center">
                                    <div className="col-md-6">
                                        <div className="d-flex align-items-center">
                                            <label className="form-label me-3 mb-0 text-muted">Filter:</label>
                                            <select 
                                                className="form-select form-select-sm w-auto"
                                                value={filterBy}
                                                onChange={(e) => setFilterBy(e.target.value)}
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
                                            <label className="form-label me-3 mb-0 text-muted">Sort by:</label>
                                            <select 
                                                className="form-select form-select-sm w-auto"
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
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
                    </div>
                </div>
            )}

            {/* Submissions List */}
            {submissions.length === 0 ? (
                <div className="row">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                                <div className="mb-4">
                                    <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-4 mb-3">
                                        <i className="bi bi-clipboard-data text-primary" style={{ fontSize: '3rem' }}></i>
                                    </div>
                                </div>
                                <h3 className="text-muted mb-3">No Security Audits Yet</h3>
                                <p className="text-muted mb-4 col-md-6 mx-auto">
                                    Start your first security assessment to identify potential vulnerabilities 
                                    and improve your organization's security posture.
                                </p>
                                <Link to="/audit" className="btn btn-primary btn-lg shadow-sm">
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Start Your First Assessment
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="row">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-bottom py-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="card-title mb-0">
                                        <i className="bi bi-list-ul me-2 text-primary"></i>
                                        Assessment History
                                    </h5>
                                    <span className="badge bg-primary">{filteredSubmissions.length} result{filteredSubmissions.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                            <div className="list-group list-group-flush">
                                {filteredSubmissions.map((submission, index) => (
                                    <Link 
                                        key={submission.id}
                                        to={`/submissions/${submission.id}`}
                                        className="list-group-item list-group-item-action border-0 py-4"
                                        style={{textDecoration: 'none'}}
                                    >
                                        <div className="d-flex w-100 justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <div className="d-flex align-items-center mb-3">
                                                    <div className="me-3">
                                                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                                                            <span style={{ fontSize: '1.5rem' }}>
                                                                {getRiskIcon(submission.overall_risk || 'low')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-1 fw-bold text-dark">
                                                            {submission.title || `Security Assessment #${submission.id}`}
                                                        </h6>
                                                        <div className="d-flex align-items-center gap-2 mb-2">
                                                            <span className={`badge ${getRiskLevelBadge(submission.overall_risk || 'low')}`}>
                                                                {(submission.overall_risk || 'low').toUpperCase()} RISK
                                                            </span>
                                                            <span className={`badge ${getStatusBadge(submission.status)}`}>
                                                                <i className={`bi ${getStatusIcon(submission.status)} me-1`}></i>
                                                                {submission.status?.replace('_', ' ').toUpperCase()}
                                                            </span>
                                                            {submission.review_progress && submission.status !== 'completed' && (
                                                                <span className="badge bg-info">
                                                                    {submission.review_progress}% Reviewed
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="row text-muted small">
                                                    <div className="col-md-6 mb-2">
                                                        <i className="bi bi-calendar3 me-2"></i>
                                                        <strong>Submitted:</strong> {new Date(submission.created_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                        <span className="ms-2 text-primary">({getTimeAgo(submission.created_at)})</span>
                                                    </div>
                                                    <div className="col-md-6 mb-2">
                                                        <i className="bi bi-person me-2"></i>
                                                        <strong>By:</strong> {submission.user?.name || 'Unknown User'}
                                                    </div>
                                                    {submission.reviewed_at && (
                                                        <div className="col-md-6">
                                                            <i className="bi bi-check-circle me-2"></i>
                                                            <strong>Reviewed:</strong> {new Date(submission.reviewed_at).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric'
                                                            })}
                                                        </div>
                                                    )}
                                                    {submission.answers_count && (
                                                        <div className="col-md-6">
                                                            <i className="bi bi-list-check me-2"></i>
                                                            <strong>Questions:</strong> {submission.answers_count} answered
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {submission.admin_summary && (
                                                    <div className="mt-3 p-3 bg-light rounded">
                                                        <small className="text-muted">
                                                            <i className="bi bi-chat-quote me-2"></i>
                                                            <strong>Admin Summary:</strong>
                                                        </small>
                                                        <p className="mb-0 mt-1 small text-dark">
                                                            {submission.admin_summary.length > 150 
                                                                ? `${submission.admin_summary.substring(0, 150)}...` 
                                                                : submission.admin_summary
                                                            }
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="ms-3 d-flex align-items-center">
                                                <div className="text-center">
                                                    <i className="bi bi-chevron-right text-muted"></i>
                                                    <div className="small text-muted mt-1">View</div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Info */}
            {submissions.length > 0 && (
                <div className="row mt-4">
                    <div className="col-12">
                        <div className="card border-0 bg-light shadow-sm">
                            <div className="card-body py-3">
                                <div className="row text-center">
                                    <div className="col-md-4 mb-2 mb-md-0">
                                        <div className="d-flex align-items-center justify-content-center">
                                            <i className="bi bi-info-circle text-primary me-2"></i>
                                            <small className="text-muted">
                                                Click any submission for detailed analysis
                                            </small>
                                        </div>
                                    </div>
                                    <div className="col-md-4 mb-2 mb-md-0">
                                        <div className="d-flex align-items-center justify-content-center">
                                            <i className="bi bi-shield-check text-success me-2"></i>
                                            <small className="text-muted">
                                                Regular assessments improve security
                                            </small>
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <div className="d-flex align-items-center justify-content-center">
                                            <i className="bi bi-graph-up text-info me-2"></i>
                                            <small className="text-muted">
                                                Track your security progress over time
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubmissionsList;