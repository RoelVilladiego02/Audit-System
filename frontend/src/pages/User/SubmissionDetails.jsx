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

const SubmissionDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [expandedAnswers, setExpandedAnswers] = useState({});

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchSubmissionDetails();
    }, [id, user, navigate]);

    const fetchSubmissionDetails = async () => {
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
    };

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
            <div className="container-fluid py-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h5 className="text-muted">Loading submission details...</h5>
                        <p className="text-muted small">Please wait while we fetch your assessment data</p>
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
                                <h5 className="text-danger mb-3">Unable to Load Submission</h5>
                                <p className="text-muted mb-4">{error}</p>
                                <div className="d-flex justify-content-center gap-2">
                                    <button onClick={fetchSubmissionDetails} className="btn btn-primary">
                                        <i className="bi bi-arrow-clockwise me-2"></i>
                                        Try Again
                                    </button>
                                    <Link to="/submissions" className="btn btn-outline-secondary">
                                        <i className="bi bi-arrow-left me-2"></i>
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
            <div className="container-fluid py-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <div className="card shadow-sm border-0">
                            <div className="card-body text-center py-5">
                                <i className="bi bi-info-circle text-info mb-3" style={{ fontSize: '3rem' }}></i>
                                <h5 className="text-muted mb-3">No Data Found</h5>
                                <p className="text-muted mb-4">No submission data found for this assessment.</p>
                                <Link to="/submissions" className="btn btn-primary">
                                    <i className="bi bi-arrow-left me-2"></i>
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
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    {/* Breadcrumb Navigation */}
                    <nav aria-label="breadcrumb" className="mb-4">
                        <ol className="breadcrumb bg-white rounded shadow-sm px-3 py-2">
                            <li className="breadcrumb-item">
                                <Link to="/submissions" className="text-decoration-none">
                                    <i className="bi bi-house me-1"></i>
                                    My Submissions
                                </Link>
                            </li>
                            <li className="breadcrumb-item active" aria-current="page">
                                Assessment #{submission.id}
                            </li>
                        </ol>
                    </nav>

                    {/* Header Card */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className={`card-header text-center py-4 ${getRiskLevelClass(effectiveOverallRisk)}`}>
                            <div className="row align-items-center">
                                <div className="col-md-8 text-md-start">
                                    <h1 className="h3 mb-2">
                                        <i className="bi bi-shield-check me-2"></i>
                                        {submission.title || `Security Assessment #${submission.id}`}
                                    </h1>
                                    <div className="d-flex flex-wrap align-items-center gap-3">
                                        <div className="d-flex align-items-center">
                                            <i className="bi bi-calendar3 me-2"></i>
                                            <span>{new Date(submission.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}</span>
                                            <small className="ms-2 opacity-75">({getTimeAgo(submission.created_at)})</small>
                                        </div>
                                        {submission.user && (
                                            <div className="d-flex align-items-center">
                                                <i className="bi bi-person me-2"></i>
                                                <span>{submission.user.name || submission.user.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                    <div className="mb-2">
                                        <span className={`badge ${getStatusBadge(submission.status)} px-3 py-2`} style={{ fontSize: '0.9rem' }}>
                                            <i className={`bi ${getStatusIcon(submission.status)} me-2`}></i>
                                            {submission.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    {submission.review_progress && submission.status !== 'completed' && (
                                        <div className="small opacity-75">
                                            <i className="bi bi-clock me-1"></i>
                                            {submission.review_progress}% Reviewed
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row text-center">
                                <div className="col-md-3">
                                    <div className="border-end border-md-end-0 border-bottom border-md-bottom-0 pb-3 pb-md-0">
                                        <div className="display-6 text-primary mb-1">{getRiskIcon(effectiveOverallRisk)}</div>
                                        <h5 className="fw-bold text-uppercase">{effectiveOverallRisk} Risk</h5>
                                        <p className="text-muted small mb-0">Overall Assessment</p>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="border-end border-md-end-0 border-bottom border-md-bottom-0 pb-3 pb-md-0 pt-3 pt-md-0">
                                        <h4 className="text-danger fw-bold">{riskStats.high}</h4>
                                        <p className="text-muted small mb-0">High Risk Items</p>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="border-end border-md-end-0 border-bottom border-md-bottom-0 pb-3 pb-md-0 pt-3 pt-md-0">
                                        <h4 className="text-warning fw-bold">{riskStats.medium}</h4>
                                        <p className="text-muted small mb-0">Medium Risk Items</p>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="pt-3 pt-md-0">
                                        <h4 className="text-success fw-bold">{riskStats.low}</h4>
                                        <p className="text-muted small mb-0">Low Risk Items</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Admin Override Notice */}
                            {submission.admin_overall_risk && submission.admin_overall_risk !== submission.system_overall_risk && (
                                <div className="alert alert-info mt-3 mb-0">
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-person-check me-2"></i>
                                        <div>
                                            <strong>Admin Review Applied:</strong> 
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
                        <div className="card shadow-sm border-0 mb-4">
                            <div className="card-header bg-primary text-white">
                                <h5 className="card-title mb-0">
                                    <i className="bi bi-person-check me-2"></i>
                                    Admin Review Summary
                                </h5>
                            </div>
                            <div className="card-body">
                                <p className="mb-0 text-dark">{submission.admin_summary}</p>
                                {submission.reviewed_at && submission.reviewer && (
                                    <div className="mt-3 pt-3 border-top">
                                        <small className="text-muted">
                                            <i className="bi bi-person me-1"></i>
                                            Reviewed by <strong>{submission.reviewer.name}</strong> on{' '}
                                            {new Date(submission.reviewed_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </small>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab Navigation */}
                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white">
                            <ul className="nav nav-tabs card-header-tabs" role="tablist">
                                <li className="nav-item" role="presentation">
                                    <button 
                                        className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('overview')}
                                        type="button"
                                    >
                                        <i className="bi bi-grid-3x3-gap me-2"></i>
                                        Overview
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button 
                                        className={`nav-link ${activeTab === 'details' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('details')}
                                        type="button"
                                    >
                                        <i className="bi bi-list-check me-2"></i>
                                        Detailed Analysis ({totalAnswers})
                                    </button>
                                </li>
                                <li className="nav-item" role="presentation">
                                    <button 
                                        className={`nav-link ${activeTab === 'recommendations' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('recommendations')}
                                        type="button"
                                    >
                                        <i className="bi bi-lightbulb me-2"></i>
                                        Recommendations
                                    </button>
                                </li>
                            </ul>
                        </div>
                        <div className="card-body">
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="tab-pane fade show active">
                                    <div className="row">
                                        <div className="col-md-6 mb-4">
                                            <div className="card border-0 bg-light h-100">
                                                <div className="card-body">
                                                    <h6 className="card-title text-primary mb-3">
                                                        <i className="bi bi-bar-chart me-2"></i>
                                                        Risk Distribution
                                                    </h6>
                                                    <div className="row">
                                                        <div className="col-4 text-center">
                                                            <div className="text-danger h3">{riskStats.high}</div>
                                                            <small className="text-muted">High</small>
                                                        </div>
                                                        <div className="col-4 text-center">
                                                            <div className="text-warning h3">{riskStats.medium}</div>
                                                            <small className="text-muted">Medium</small>
                                                        </div>
                                                        <div className="col-4 text-center">
                                                            <div className="text-success h3">{riskStats.low}</div>
                                                            <small className="text-muted">Low</small>
                                                        </div>
                                                    </div>
                                                    <div className="progress mt-3" style={{ height: '8px' }}>
                                                        <div className="progress-bar bg-danger" style={{ width: `${(riskStats.high / totalAnswers) * 100}%` }}></div>
                                                        <div className="progress-bar bg-warning" style={{ width: `${(riskStats.medium / totalAnswers) * 100}%` }}></div>
                                                        <div className="progress-bar bg-success" style={{ width: `${(riskStats.low / totalAnswers) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6 mb-4">
                                            <div className="card border-0 bg-light h-100">
                                                <div className="card-body">
                                                    <h6 className="card-title text-primary mb-3">
                                                        <i className="bi bi-info-circle me-2"></i>
                                                        Assessment Details
                                                    </h6>
                                                    <div className="row g-3">
                                                        <div className="col-12">
                                                            <div className="d-flex justify-content-between">
                                                                <span className="text-muted">Total Questions:</span>
                                                                <span className="fw-bold">{totalAnswers}</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-12">
                                                            <div className="d-flex justify-content-between">
                                                                <span className="text-muted">Completion:</span>
                                                                <span className="fw-bold text-success">100%</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-12">
                                                            <div className="d-flex justify-content-between">
                                                                <span className="text-muted">Review Status:</span>
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
                                <div className="tab-pane fade show active">
                                    {submission.answers && submission.answers.length > 0 ? (
                                        <div className="row">
                                            {submission.answers.map((answer, index) => {
                                                const effectiveRiskLevel = answer.admin_risk_level || answer.system_risk_level || 'low';
                                                const isReviewed = answer.admin_risk_level || answer.reviewed_by;
                                                const isExpanded = expandedAnswers[answer.id];
                                                
                                                return (
                                                    <div key={answer.id || index} className="col-12 mb-3">
                                                        <div className="card border-0 shadow-sm">
                                                            <div className="card-body">
                                                                <div className="d-flex justify-content-between align-items-start mb-3">
                                                                    <div className="flex-grow-1">
                                                                        <div className="d-flex align-items-center mb-2">
                                                                            <span className="badge bg-primary me-2">{index + 1}</span>
                                                                            <h6 className="card-title mb-0 flex-grow-1">
                                                                                {answer.question?.question || 'Question not available'}
                                                                            </h6>
                                                                            {isReviewed && (
                                                                                <i className="bi bi-check-circle-fill text-success ms-2" title="Admin Reviewed"></i>
                                                                            )}
                                                                            <button
                                                                                className="btn btn-sm btn-outline-secondary ms-2"
                                                                                onClick={() => toggleAnswerExpansion(answer.id)}
                                                                                title={isExpanded ? "Collapse" : "Expand"}
                                                                            >
                                                                                <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                                                            </button>
                                                                        </div>
                                                                        {answer.question?.description && (
                                                                            <p className="text-muted small mb-2">
                                                                                {answer.question.description}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="ms-3">
                                                                        <span className={`badge ${getRiskLevelClass(effectiveRiskLevel).split(' ')[0]} text-white px-2 py-1`}>
                                                                            {getRiskIcon(effectiveRiskLevel)} {effectiveRiskLevel?.toUpperCase()}
                                                                        </span>
                                                                        {answer.admin_risk_level && answer.admin_risk_level !== answer.system_risk_level && (
                                                                            <div className="mt-1">
                                                                                <small className="text-muted">
                                                                                    System: {answer.system_risk_level?.toUpperCase()}
                                                                                </small>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="mb-3">
                                                                    <div className="d-flex align-items-center mb-2">
                                                                        <i className="bi bi-chat-quote text-primary me-2"></i>
                                                                        <strong className="text-primary">Your Answer:</strong>
                                                                    </div>
                                                                    <div className="bg-light rounded p-3">
                                                                        <span className="text-dark">{answer.answer}</span>
                                                                    </div>
                                                                </div>

                                                                {isExpanded && (
                                                                    <div className="border-top pt-3">
                                                                        {answer.recommendation && (
                                                                            <div className="alert alert-info mb-3">
                                                                                <div className="d-flex align-items-start">
                                                                                    <i className="bi bi-lightbulb text-info me-2 mt-1"></i>
                                                                                    <div>
                                                                                        <strong>Recommendation:</strong>
                                                                                        <div className="mt-1">{answer.recommendation}</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {answer.admin_notes && (
                                                                            <div className="alert alert-warning mb-3">
                                                                                <div className="d-flex align-items-start">
                                                                                    <i className="bi bi-person-check text-warning me-2 mt-1"></i>
                                                                                    <div>
                                                                                        <strong>Admin Notes:</strong>
                                                                                        <div className="mt-1">{answer.admin_notes}</div>
                                                                                        {answer.reviewer && (
                                                                                            <small className="text-muted d-block mt-2">
                                                                                                Reviewed by {answer.reviewer.name} on {new Date(answer.reviewed_at).toLocaleDateString()}
                                                                                            </small>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {answer.question?.risk_criteria && (
                                                                            <div className="card bg-light">
                                                                                <div className="card-body py-2">
                                                                                    <h6 className="card-title small text-muted mb-2">Risk Assessment Criteria:</h6>
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
                                        <div className="text-center py-5">
                                            <i className="bi bi-inbox text-muted" style={{ fontSize: '3rem' }}></i>
                                            <h5 className="text-muted mt-3">No Answers Found</h5>
                                            <p className="text-muted">No answers were found for this submission.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recommendations Tab */}
                            {activeTab === 'recommendations' && (
                                <div className="tab-pane fade show active">
                                    <div className="row">
                                        {/* High Priority Recommendations */}
                                        {submission.answers?.filter(a => (a.admin_risk_level || a.system_risk_level) === 'high').length > 0 && (
                                            <div className="col-12 mb-4">
                                                <div className="card border-danger">
                                                    <div className="card-header bg-danger text-white">
                                                        <h5 className="card-title mb-0">
                                                            <i className="bi bi-exclamation-triangle me-2"></i>
                                                            High Priority Actions Required
                                                        </h5>
                                                    </div>
                                                    <div className="card-body">
                                                        {submission.answers
                                                            .filter(a => (a.admin_risk_level || a.system_risk_level) === 'high')
                                                            .map((answer, index) => (
                                                                <div key={answer.id} className={`${index > 0 ? 'border-top pt-3 mt-3' : ''}`}>
                                                                    <h6 className="text-danger mb-2">
                                                                        {answer.question?.question || 'Question not available'}
                                                                    </h6>
                                                                    {answer.recommendation && (
                                                                        <p className="mb-0">{answer.recommendation}</p>
                                                                    )}
                                                                    {answer.admin_notes && (
                                                                        <div className="mt-2 p-2 bg-light rounded">
                                                                            <small className="text-muted">
                                                                                <strong>Admin Note:</strong> {answer.admin_notes}
                                                                            </small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Medium Priority Recommendations */}
                                        {submission.answers?.filter(a => (a.admin_risk_level || a.system_risk_level) === 'medium').length > 0 && (
                                            <div className="col-12 mb-4">
                                                <div className="card border-warning">
                                                    <div className="card-header bg-warning text-dark">
                                                        <h5 className="card-title mb-0">
                                                            <i className="bi bi-exclamation-circle me-2"></i>
                                                            Medium Priority Improvements
                                                        </h5>
                                                    </div>
                                                    <div className="card-body">
                                                        {submission.answers
                                                            .filter(a => (a.admin_risk_level || a.system_risk_level) === 'medium')
                                                            .map((answer, index) => (
                                                                <div key={answer.id} className={`${index > 0 ? 'border-top pt-3 mt-3' : ''}`}>
                                                                    <h6 className="text-warning mb-2">
                                                                        {answer.question?.question || 'Question not available'}
                                                                    </h6>
                                                                    {answer.recommendation && (
                                                                        <p className="mb-0">{answer.recommendation}</p>
                                                                    )}
                                                                    {answer.admin_notes && (
                                                                        <div className="mt-2 p-2 bg-light rounded">
                                                                            <small className="text-muted">
                                                                                <strong>Admin Note:</strong> {answer.admin_notes}
                                                                            </small>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* General Recommendations */}
                                        <div className="col-12">
                                            <div className="card border-success">
                                                <div className="card-header bg-success text-white">
                                                    <h5 className="card-title mb-0">
                                                        <i className="bi bi-lightbulb me-2"></i>
                                                        General Security Best Practices
                                                    </h5>
                                                </div>
                                                <div className="card-body">
                                                    <div className="row">
                                                        <div className="col-md-6 mb-3">
                                                            <div className="d-flex align-items-start">
                                                                <i className="bi bi-shield-check text-success me-2 mt-1"></i>
                                                                <div>
                                                                    <h6>Regular Security Reviews</h6>
                                                                    <p className="small text-muted mb-0">
                                                                        Conduct security assessments quarterly to stay ahead of emerging threats.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6 mb-3">
                                                            <div className="d-flex align-items-start">
                                                                <i className="bi bi-people text-success me-2 mt-1"></i>
                                                                <div>
                                                                    <h6>Security Training</h6>
                                                                    <p className="small text-muted mb-0">
                                                                        Ensure all team members receive regular security awareness training.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6 mb-3">
                                                            <div className="d-flex align-items-start">
                                                                <i className="bi bi-lock text-success me-2 mt-1"></i>
                                                                <div>
                                                                    <h6>Access Control</h6>
                                                                    <p className="small text-muted mb-0">
                                                                        Implement role-based access control and regularly review permissions.
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="col-md-6 mb-3">
                                                            <div className="d-flex align-items-start">
                                                                <i className="bi bi-cloud-check text-success me-2 mt-1"></i>
                                                                <div>
                                                                    <h6>Data Backup</h6>
                                                                    <p className="small text-muted mb-0">
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
                    <div className="mt-4 text-center">
                        <Link
                            to="/audit"
                            className="btn btn-primary me-3"
                        >
                            <i className="bi bi-plus-circle me-2"></i>
                            Take Another Audit
                        </Link>
                        <Link
                            to="/submissions"
                            className="btn btn-outline-secondary"
                        >
                            <i className="bi bi-list me-2"></i>
                            View All Submissions
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubmissionDetails;