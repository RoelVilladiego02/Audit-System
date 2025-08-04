import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import api from '../../api/axios';

const getRiskLevelClass = (level) => {
    const classes = {
        high: 'bg-danger text-white border-danger',
        medium: 'bg-warning text-dark border-warning',
        low: 'bg-success text-white border-success'
    };
    return classes[level?.toLowerCase()] || 'bg-secondary text-white border-secondary';
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

const SubmissionDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedAnswers, setExpandedAnswers] = useState({});

    const fetchSubmissionDetails = React.useCallback(async () => {
        try {
            const url = `/audit-submissions/${id}`;
            console.log('Fetching submission details:', {
                url: url,
                id: id,
                user: user?.id,
                role: user?.role,
                token: localStorage.getItem('token') ? 'Present' : 'Missing',
                baseURL: api.defaults.baseURL
            });

            const response = await api.get(url);
            console.log('Submission data received:', response.data);
            
            if (!response.data) {
                throw new Error('No data received from server');
            }
            
            setSubmission(response.data);
        } catch (err) {
            console.error('Error fetching submission details:', {
                error: err.message,
                status: err.response?.status,
                data: err.response?.data,
                id: id,
                user: user?.id,
                role: user?.role,
                config: err.config
            });
            
            if (err.response?.status === 404) {
                setError('Submission not found. It may have been deleted or you may not have permission to view it.');
            } else if (err.response?.status === 403) {
                setError('You do not have permission to view this submission.');
            } else if (err.response?.status === 401) {
                navigate('/login', {
                    state: { 
                        from: `/submissions/${id}`,
                        message: 'Please log in again to view this submission.'
                    }
                });
                return;
            } else {
                setError(
                    err.response?.data?.message || 
                    'Failed to load submission details. Please try again later. ' +
                    `(Status: ${err.response?.status || 'Unknown'})`
                );
            }
        } finally {
            setLoading(false);
        }
    }, [id, user, navigate]);

    useEffect(() => {
        if (!user) {
            navigate('/login', {
                state: { 
                    from: `/submissions/${id}`,
                    message: 'Please log in to view this submission.'
                }
            });
            return;
        }
        fetchSubmissionDetails();
    }, [id, user, navigate, fetchSubmissionDetails]);

    const toggleAnswerExpansion = (answerId) => {
        setExpandedAnswers(prev => ({
            ...prev,
            [answerId]: !prev[answerId]
        }));
    };

    const getRiskStats = () => {
        if (!submission?.answers || submission.answers.length === 0) return { high: 0, medium: 0, low: 0 };
        
        const stats = { high: 0, medium: 0, low: 0 };
        submission.answers.forEach(answer => {
            const riskLevel = answer.admin_risk_level || answer.system_risk_level || 'low';
            if (stats.hasOwnProperty(riskLevel)) {
                stats[riskLevel]++;
            }
        });
        return stats;
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
                    <h5 className="fw-bold text-muted">Loading Submission Details...</h5>
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
                                    <button onClick={fetchSubmissionDetails} className="btn btn-sm btn-primary" aria-label="Retry loading submission">
                                        <i className="bi bi-arrow-clockwise me-2" aria-hidden="true"></i>
                                        Try Again
                                    </button>
                                    <Link to="/submissions" className="btn btn-sm btn-outline-secondary" aria-label="Back to submissions">
                                        <i className="bi bi-arrow-left me-2" aria-hidden="true"></i>
                                        Back to Submissions
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="container-fluid min-vh-100 bg-light py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-0 py-3">
                                <h5 className="fw-bold text-muted mb-0">No Data</h5>
                            </div>
                            <div className="card-body text-center py-4">
                                <i className="bi bi-info-circle text-primary mb-3" style={{ fontSize: '2rem' }} aria-hidden="true"></i>
                                <p className="text-muted mb-4">No submission data found for this assessment.</p>
                                <Link to="/submissions" className="btn btn-sm btn-primary" aria-label="Back to submissions">
                                    <i className="bi bi-arrow-left me-2" aria-hidden="true"></i>
                                    Back to Submissions
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const riskStats = getRiskStats();
    const totalAnswers = submission.answers?.length || 0;
    const effectiveOverallRisk = submission.effective_overall_risk || submission.admin_overall_risk || submission.system_overall_risk || 'low';

    return (
        <div className="container-fluid min-vh-100 bg-light py-4">
            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-9">
                    {/* Breadcrumb Navigation */}
                    <nav aria-label="breadcrumb" className="mb-4">
                        <ol className="breadcrumb bg-white rounded shadow-sm px-3 py-2">
                            <li className="breadcrumb-item">
                                <Link to="/submissions" className="text-decoration-none text-primary">
                                    <i className="bi bi-house me-1" aria-hidden="true"></i>
                                    My Submissions
                                </Link>
                            </li>
                            <li className="breadcrumb-item active fw-semibold" aria-current="page">
                                Assessment #{submission.id}
                            </li>
                        </ol>
                    </nav>

                    {/* Header Card */}
                    <div className="card border-0 shadow-sm mb-4">
                        <div className={`card-header ${getRiskLevelClass(effectiveOverallRisk)} py-3`}>
                            <div className="row align-items-center">
                                <div className="col-md-8 text-md-start">
                                    <h3 className="fw-bold mb-2">
                                        <i className="bi bi-shield-fill-check me-2" aria-hidden="true"></i>
                                        {submission.title || `Security Assessment #${submission.id}`}
                                    </h3>
                                    <div className="d-flex flex-wrap align-items-center gap-3">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-calendar3 me-2" aria-hidden="true"></i>
                                            <span>{new Date(submission.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}</span>
                                            <small className="ms-2 text-muted">({getTimeAgo(submission.created_at)})</small>
                                        </div>
                                        {submission.user && (
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-person me-2" aria-hidden="true"></i>
                                                <span>{submission.user.name || submission.user.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                    <div className="mb-2">
                                        <span className={`badge ${getStatusBadge(submission.status)} px-3 py-2`} style={{ fontSize: '0.9rem' }}>
                                            <i className={`bi ${getStatusIcon(submission.status)} me-2`} aria-hidden="true"></i>
                                            {submission.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    {submission.review_progress && submission.status !== 'completed' && (
                                        <div className="small text-muted">
                                            <i className="bi bi-clock me-1" aria-hidden="true"></i>
                                            {submission.review_progress}% Reviewed
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card-body py-3">
                            <div className="row text-center">
                                <div className="col-md-3 mb-3 mb-md-0">
                                    <div className="border-end border-md-end-0 border-bottom border-md-bottom-0 pb-3 pb-md-0">
                                        <i className={`${getRiskIcon(effectiveOverallRisk)} mb-2`} style={{ fontSize: '2rem' }} aria-hidden="true"></i>
                                        <h5 className="fw-bold text-uppercase">{effectiveOverallRisk} Risk</h5>
                                        <p className="text-muted small fw-semibold mb-0">Overall Assessment</p>
                                    </div>
                                </div>
                                <div className="col-md-3 mb-3 mb-md-0">
                                    <div className="border-end border-md-end-0 border-bottom border-md-bottom-0 pb-3 pb-md-0 pt-3 pt-md-0">
                                        <h4 className="fw-bold text-danger">{riskStats.high}</h4>
                                        <p className="text-muted small fw-semibold mb-0">High Risk Items</p>
                                    </div>
                                </div>
                                <div className="col-md-3 mb-3 mb-md-0">
                                    <div className="border-end border-md-end-0 border-bottom border-md-bottom-0 pb-3 pb-md-0 pt-3 pt-md-0">
                                        <h4 className="fw-bold text-warning">{riskStats.medium}</h4>
                                        <p className="text-muted small fw-semibold mb-0">Medium Risk Items</p>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="pt-3 pt-md-0">
                                        <h4 className="fw-bold text-success">{riskStats.low}</h4>
                                        <p className="text-muted small fw-semibold mb-0">Low Risk Items</p>
                                    </div>
                                </div>
                            </div>
                            {submission.admin_overall_risk && submission.admin_overall_risk !== submission.system_overall_risk && (
                                <div className="alert alert-info border-0 shadow-sm mt-3 mb-0">
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-person-check-fill me-2" aria-hidden="true"></i>
                                        <div>
                                            <strong className="fw-semibold">Admin Review Applied:</strong> 
                                            Risk level adjusted from <span className="badge bg-secondary ms-1">{submission.system_overall_risk?.toUpperCase()}</span> 
                                            to <span className={`badge ${getRiskLevelClass(submission.admin_overall_risk).split(' ')[0]} ms-1`}>{submission.admin_overall_risk?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Admin Summary */}
                    {submission.admin_summary && (
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-white border-0 py-3">
                                <h5 className="fw-bold mb-0">
                                    <i className="bi bi-person-check-fill me-2 text-primary" aria-hidden="true"></i>
                                    Admin Review Summary
                                </h5>
                            </div>
                            <div className="card-body py-3">
                                <p className="text-dark mb-3">{submission.admin_summary}</p>
                                {submission.reviewed_at && submission.reviewer && (
                                    <div className="border-top pt-3">
                                        <p className="text-muted small fw-semibold mb-0">
                                            <i className="bi bi-person me-2" aria-hidden="true"></i>
                                            Reviewed by <strong>{submission.reviewer.name}</strong> on{' '}
                                            {new Date(submission.reviewed_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-0 py-3">
                            <ul className="nav nav-tabs card-header-tabs" role="tablist">
                                <li className="nav-item" role="presentation">
                                    <button 
                                        className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('overview')}
                                        type="button"
                                        aria-selected={activeTab === 'overview'}
                                        role="tab"
                                    >
                                        <i className="bi bi-grid-3x3-gap me-2" aria-hidden="true"></i>
                                        Overview
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button 
                                        className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('details')}
                                        type="button"
                                        aria-selected={activeTab === 'details'}
                                        role="tab"
                                    >
                                        <i className="bi bi-list-check me-2" aria-hidden="true"></i>
                                        Detailed Analysis ({totalAnswers})
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button 
                                        className={`nav-link ${activeTab === 'recommendations' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('recommendations')}
                                        type="button"
                                        aria-selected={activeTab === 'recommendations'}
                                        role="tab"
                                    >
                                        <i className="bi bi-lightbulb me-2" aria-hidden="true"></i>
                                        Recommendations
                                    </button>
                                </li>
                            </ul>
                        </div>
                        <div className="card-body py-3">
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="tab-pane fade show active" role="tabpanel">
                                    <div className="row">
                                        <div className="col-md-6 mb-4">
                                            <div className="card border-0 shadow-sm bg-light h-100">
                                                <div className="card-body">
                                                    <h6 className="fw-bold text-primary mb-3">
                                                        <i className="bi bi-bar-chart me-2" aria-hidden="true"></i>
                                                        Risk Distribution
                                                    </h6>
                                                    <div className="row text-center">
                                                        <div className="col-4">
                                                            <div className="text-danger h4 fw-bold">{riskStats.high}</div>
                                                            <p className="text-muted small fw-semibold mb-0">High</p>
                                                        </div>
                                                        <div className="col-4">
                                                            <div className="text-warning h4 fw-bold">{riskStats.medium}</div>
                                                            <p className="text-muted small fw-semibold mb-0">Medium</p>
                                                        </div>
                                                        <div className="col-4">
                                                            <div className="text-success h4 fw-bold">{riskStats.low}</div>
                                                            <p className="text-muted small fw-semibold mb-0">Low</p>
                                                        </div>
                                                    </div>
                                                    <div className="progress mt-3" style={{ height: '10px' }}>
                                                        <div className="progress-bar bg-danger" style={{ width: `${(riskStats.high / totalAnswers) * 100}%` }} role="progressbar" aria-valuenow={(riskStats.high / totalAnswers) * 100} aria-valuemin="0" aria-valuemax="100"></div>
                                                        <div className="progress-bar bg-warning" style={{ width: `${(riskStats.medium / totalAnswers) * 100}%` }} role="progressbar" aria-valuenow={(riskStats.medium / totalAnswers) * 100} aria-valuemin="0" aria-valuemax="100"></div>
                                                        <div className="progress-bar bg-success" style={{ width: `${(riskStats.low / totalAnswers) * 100}%` }} role="progressbar" aria-valuenow={(riskStats.low / totalAnswers) * 100} aria-valuemin="0" aria-valuemax="100"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6 mb-4">
                                            <div className="card border-0 shadow-sm bg-light h-100">
                                                <div className="card-body">
                                                    <h6 className="fw-bold text-primary mb-3">
                                                        <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
                                                        Assessment Details
                                                    </h6>
                                                    <div className="row g-3">
                                                        <div className="col-12">
                                                            <div className="d-flex justify-content-between">
                                                                <span className="text-muted fw-semibold">Total Questions:</span>
                                                                <span className="fw-bold">{totalAnswers}</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-12">
                                                            <div className="d-flex justify-content-between">
                                                                <span className="text-muted fw-semibold">Completion:</span>
                                                                <span className="fw-bold text-success">100%</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-12">
                                                            <div className="d-flex justify-content-between">
                                                                <span className="text-muted fw-semibold">Review Status:</span>
                                                                <span className={`badge ${getStatusBadge(submission.status)}`}>
                                                                    {submission.status?.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Details Tab */}
                            {activeTab === 'details' && (
                                <div className="tab-pane fade show active" role="tabpanel">
                                    {submission.answers && submission.answers.length > 0 ? (
                                        <div className="row">
                                            {submission.answers.map((answer, index) => {
                                                const effectiveRiskLevel = answer.admin_risk_level || answer.system_risk_level || 'low';
                                                const isReviewed = answer.admin_risk_level || answer.reviewed_by;
                                                const isExpanded = expandedAnswers[answer.id];
                                                
                                                return (
                                                    <div key={answer.id || index} className="col-12 mb-4">
                                                        <div className="card border-0 shadow-sm">
                                                            <div className="card-header bg-white border-0 py-3">
                                                                <div className="d-flex justify-content-between align-items-center">
                                                                    <div className="flex-grow-1">
                                                                        <div className="d-flex align-items-center mb-2">
                                                                            <span className="badge bg-primary me-2" style={{ width: '30px', height: '30px', lineHeight: 'normal' }}>{index + 1}</span>
                                                                            <div>
                                                                                <span className="badge bg-info text-dark me-2 text-truncate" style={{ fontSize: '0.75rem', maxWidth: '150px' }}>
                                                                                    {answer.question?.category || 'Uncategorized'}
                                                                                </span>
                                                                                <h6 className="fw-bold mb-0 d-inline">
                                                                                    {answer.question?.question || 'Question not available'}
                                                                                    {isReviewed && (
                                                                                        <i className="bi bi-check-circle-fill text-success ms-2" title="Admin Reviewed" aria-hidden="true"></i>
                                                                                    )}
                                                                                </h6>
                                                                            </div>
                                                                        </div>
                                                                        {answer.question?.description && (
                                                                            <p className="text-muted small mb-0">{answer.question.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <div className="d-flex align-items-center">
                                                                        <span className={`badge ${getRiskLevelClass(effectiveRiskLevel).split(' ')[0]} px-2 py-1`} style={{ fontSize: '0.75rem' }}>
                                                                            <i className={getRiskIcon(effectiveRiskLevel)} aria-hidden="true"></i> {effectiveRiskLevel?.toUpperCase()}
                                                                        </span>
                                                                        <button
                                                                            className="btn btn-sm btn-outline-primary ms-2"
                                                                            onClick={() => toggleAnswerExpansion(answer.id)}
                                                                            aria-label={isExpanded ? "Collapse answer details" : "Expand answer details"}
                                                                            title={isExpanded ? "Collapse" : "Expand"}
                                                                        >
                                                                            <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} aria-hidden="true"></i>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="card-body py-3">
                                                                <div className="mb-3">
                                                                    <div className="d-flex align-items-center mb-2">
                                                                        <i className="bi bi-chat-quote-fill text-primary me-2" aria-hidden="true"></i>
                                                                        <strong className="fw-semibold text-primary">Your Answer:</strong>
                                                                    </div>
                                                                    <div className="bg-light rounded p-3">
                                                                        <span className="text-dark">{answer.answer}</span>
                                                                    </div>
                                                                </div>
                                                                {answer.admin_risk_level && answer.admin_risk_level !== answer.system_risk_level && (
                                                                    <div className="mb-3">
                                                                        <small className="text-muted fw-semibold">
                                                                            System Risk: <span className="badge bg-secondary">{answer.system_risk_level?.toUpperCase()}</span>
                                                                        </small>
                                                                    </div>
                                                                )}
                                                                {isExpanded && (
                                                                    <div className="border-top pt-3">
                                                                        {answer.recommendation && (
                                                                            <div className="alert alert-info border-0 shadow-sm mb-3">
                                                                                <div className="d-flex align-items-start">
                                                                                    <i className="bi bi-lightbulb-fill text-info me-2 mt-1" aria-hidden="true"></i>
                                                                                    <div>
                                                                                        <strong className="fw-semibold">Recommendation:</strong>
                                                                                        <div className="mt-1">{answer.recommendation}</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {answer.admin_notes && (
                                                                            <div className="alert alert-warning border-0 shadow-sm mb-3">
                                                                                <div className="d-flex align-items-start">
                                                                                    <i className="bi bi-person-check-fill text-warning me-2 mt-1" aria-hidden="true"></i>
                                                                                    <div>
                                                                                        <strong className="fw-semibold">Admin Notes:</strong>
                                                                                        <div className="mt-1">{answer.admin_notes}</div>
                                                                                        {answer.reviewer && (
                                                                                            <small className="text-muted d-block mt-2">
                                                                                                Reviewed by {answer.reviewer.name} on {new Date(answer.reviewed_at).toLocaleDateString('en-US', {
                                                                                                    year: 'numeric',
                                                                                                    month: 'short',
                                                                                                    day: 'numeric'
                                                                                                })}
                                                                                            </small>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {answer.question?.risk_criteria && (
                                                                            <div className="card border-0 shadow-sm bg-light">
                                                                                <div className="card-body py-3">
                                                                                    <h6 className="fw-semibold text-muted mb-2">
                                                                                        <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
                                                                                        Risk Assessment Criteria
                                                                                    </h6>
                                                                                    <div className="row g-2">
                                                                                        {answer.question.risk_criteria.high && (
                                                                                            <div className="col-12">
                                                                                                <div className="d-flex align-items-start">
                                                                                                    <span className="badge bg-danger me-2 mt-1">HIGH</span>
                                                                                                    <small className="text-dark">
                                                                                                        {Array.isArray(answer.question.risk_criteria.high) 
                                                                                                            ? answer.question.risk_criteria.high.join(', ') 
                                                                                                            : answer.question.risk_criteria.high}
                                                                                                    </small>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        {answer.question.risk_criteria.medium && (
                                                                                            <div className="col-12">
                                                                                                <div className="d-flex align-items-start">
                                                                                                    <span className="badge bg-warning text-dark me-2 mt-1">MED</span>
                                                                                                    <small className="text-dark">
                                                                                                        {Array.isArray(answer.question.risk_criteria.medium) 
                                                                                                            ? answer.question.risk_criteria.medium.join(', ') 
                                                                                                            : answer.question.risk_criteria.medium}
                                                                                                    </small>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        {answer.question.risk_criteria.low && (
                                                                                            <div className="col-12">
                                                                                                <div className="d-flex align-items-start">
                                                                                                    <span className="badge bg-success me-2 mt-1">LOW</span>
                                                                                                    <small className="text-dark">
                                                                                                        {Array.isArray(answer.question.risk_criteria.low) 
                                                                                                            ? answer.question.risk_criteria.low.join(', ') 
                                                                                                            : answer.question.risk_criteria.low}
                                                                                                    </small>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <i className="bi bi-inbox text-muted mb-3" style={{ fontSize: '2rem' }} aria-hidden="true"></i>
                                            <h5 className="fw-bold text-muted mb-2">No Answers Found</h5>
                                            <p className="text-muted mb-0">No answers were found for this submission.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recommendations Tab */}
                            {activeTab === 'recommendations' && (
                                <div className="tab-pane fade show active" role="tabpanel">
                                    <div className="row">
                                        {submission.answers?.filter(a => (a.admin_risk_level || a.system_risk_level) === 'high').length > 0 && (
                                            <div className="col-12 mb-4">
                                                <div className="card border-0 shadow-sm">
                                                    <div className="card-header bg-danger text-white py-3">
                                                        <h5 className="fw-bold mb-0">
                                                            <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
                                                            High Priority Actions Required
                                                        </h5>
                                                    </div>
                                                    <div className="card-body py-3">
                                                        {submission.answers
                                                            .filter(a => (a.admin_risk_level || a.system_risk_level) === 'high')
                                                            .map((answer, index) => (
                                                                <div key={answer.id} className={`${index > 0 ? 'border-top pt-3 mt-3' : ''}`}>
                                                                    <div className="d-flex align-items-center mb-2">
                                                                        <span className="badge bg-info text-dark me-2 text-truncate" style={{ fontSize: '0.75rem', maxWidth: '150px' }}>
                                                                            {answer.question?.category || 'Uncategorized'}
                                                                        </span>
                                                                        <h6 className="fw-bold text-danger mb-0">
                                                                            {answer.question?.question || 'Question not available'}
                                                                        </h6>
                                                                    </div>
                                                                    {answer.recommendation && (
                                                                        <p className="mb-2">{answer.recommendation}</p>
                                                                    )}
                                                                    {answer.admin_notes && (
                                                                        <div className="mt-2 p-3 bg-light rounded">
                                                                            <p className="text-muted small fw-semibold mb-0">
                                                                                <strong>Admin Note:</strong> {answer.admin_notes}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {submission.answers?.filter(a => (a.admin_risk_level || a.system_risk_level) === 'medium').length > 0 && (
                                            <div className="col-12 mb-4">
                                                <div className="card border-0 shadow-sm">
                                                    <div className="card-header bg-warning text-dark py-3">
                                                        <h5 className="fw-bold mb-0">
                                                            <i className="bi bi-exclamation-circle-fill me-2" aria-hidden="true"></i>
                                                            Medium Priority Improvements
                                                        </h5>
                                                    </div>
                                                    <div className="card-body py-3">
                                                        {submission.answers
                                                            .filter(a => (a.admin_risk_level || a.system_risk_level) === 'medium')
                                                            .map((answer, index) => (
                                                                <div key={answer.id} className={`${index > 0 ? 'border-top pt-3 mt-3' : ''}`}>
                                                                    <div className="d-flex align-items-center mb-2">
                                                                        <span className="badge bg-info text-dark me-2 text-truncate" style={{ fontSize: '0.75rem', maxWidth: '150px' }}>
                                                                            {answer.question?.category || 'Uncategorized'}
                                                                        </span>
                                                                        <h6 className="fw-bold text-warning mb-0">
                                                                            {answer.question?.question || 'Question not available'}
                                                                        </h6>
                                                                    </div>
                                                                    {answer.recommendation && (
                                                                        <p className="mb-2">{answer.recommendation}</p>
                                                                    )}
                                                                    {answer.admin_notes && (
                                                                        <div className="mt-2 p-3 bg-light rounded">
                                                                            <p className="text-muted small fw-semibold mb-0">
                                                                                <strong>Admin Note:</strong> {answer.admin_notes}
                                                                            </p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div className="col-12">
                                            <div className="card border-0 shadow-sm">
                                                <div className="card-header bg-success text-white py-3">
                                                    <h5 className="fw-bold mb-0">
                                                        <i className="bi bi-lightbulb-fill me-2" aria-hidden="true"></i>
                                                        General Security Best Practices
                                                    </h5>
                                                </div>
                                                <div className="card-body py-3">
                                                    <div className="row g-3">
                                                        <div className="col-md-6">
                                                            <div className="d-flex align-items-start">
                                                                <i className="bi bi-shield-fill-check text-success me-2 mt-1" aria-hidden="true"></i>
                                                                <div>
                                                                    <h6 className="fw-bold">Regular Security Reviews</h6>
                                                                    <p className="text-muted small mb-0">
                                                                        Conduct security assessments quarterly to stay ahead of emerging threats.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <div className="d-flex align-items-start">
                                                                <i className="bi bi-people-fill text-success me-2 mt-1" aria-hidden="true"></i>
                                                                <div>
                                                                    <h6 className="fw-bold">Security Training</h6>
                                                                    <p className="text-muted small mb-0">
                                                                        Ensure all team members receive regular security awareness training.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <div className="d-flex align-items-start">
                                                                <i className="bi bi-lock-fill text-success me-2 mt-1" aria-hidden="true"></i>
                                                                <div>
                                                                    <h6 className="fw-bold">Access Control</h6>
                                                                    <p className="text-muted small mb-0">
                                                                        Implement role-based access control and regularly review permissions.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <div className="d-flex align-items-start">
                                                                <i className="bi bi-cloud-check-fill text-success me-2 mt-1" aria-hidden="true"></i>
                                                                <div>
                                                                    <h6 className="fw-bold">Data Backup</h6>
                                                                    <p className="text-muted small mb-0">
                                                                        Maintain regular, encrypted backups and test restoration procedures.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="card border-0 shadow-sm bg-light mt-4">
                        <div className="card-body py-3 text-center">
                            <Link
                                to="/audit"
                                className="btn btn-sm btn-primary me-3"
                                aria-label="Start new audit"
                            >
                                <i className="bi bi-plus-circle me-2" aria-hidden="true"></i>
                                Take Another Audit
                            </Link>
                            <Link
                                to="/submissions"
                                className="btn btn-sm btn-outline-secondary"
                                aria-label="View all submissions"
                            >
                                <i className="bi bi-list-ul me-2" aria-hidden="true"></i>
                                View All Submissions
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionDetails;