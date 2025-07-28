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

const SubmissionDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchSubmissionDetails();
    }, [id, user, navigate]);

    const fetchSubmissionDetails = async () => {
        try {
            // Enhanced logging for debugging
            const url = `/audit-submissions/${id}`; // Updated to match Laravel routes
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

    if (loading) {
        return (
            <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-4">
                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        <div className="alert alert-danger" role="alert">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            {error}
                        </div>
                        <div className="text-center">
                            <Link to="/submissions" className="btn btn-primary">
                                <i className="bi bi-arrow-left me-2"></i>
                                Back to My Submissions
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="container-fluid py-4">
                <div className="alert alert-warning">
                    <i className="bi bi-info-circle me-2"></i>
                    No submission data found.
                </div>
            </div>
        );
    }

    const getRiskStats = () => {
        if (!submission.answers || submission.answers.length === 0) return { high: 0, medium: 0, low: 0 };
        
        const stats = { high: 0, medium: 0, low: 0 };
        submission.answers.forEach(answer => {
            if (answer.risk_level && stats.hasOwnProperty(answer.risk_level)) {
                stats[answer.risk_level]++;
            }
        });
        return stats;
    };

    const riskStats = getRiskStats();
    const totalAnswers = submission.answers?.length || 0;

    return (
        <div className="container-fluid py-4">
            <div className="row justify-content-center">
                <div className="col-lg-10">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <div>
                            <h1 className="h2 mb-1">
                                <i className="bi bi-clipboard-data me-2"></i>
                                Audit Results #{submission.id}
                            </h1>
                            <p className="text-muted mb-0">
                                <i className="bi bi-calendar me-1"></i>
                                Submitted on {new Date(submission.created_at).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                            {submission.user && (
                                <p className="text-muted small mb-0">
                                    <i className="bi bi-person me-1"></i>
                                    Submitted by: {submission.user.name || submission.user.email}
                                </p>
                            )}
                        </div>
                        <Link
                            to="/submissions"
                            className="btn btn-outline-secondary"
                        >
                            <i className="bi bi-arrow-left me-2"></i>
                            Back to Submissions
                        </Link>
                    </div>

                    {/* Overall Risk Summary Card */}
                    <div className="card mb-4">
                        <div className={`card-header text-center py-4 ${getRiskLevelClass(submission.overall_risk)}`}>
                            <h3 className="card-title mb-2">
                                {getRiskIcon(submission.overall_risk)} Overall Risk Level: {submission.overall_risk?.toUpperCase()}
                            </h3>
                            <p className="card-text mb-0">
                                {submission.title || 'Security Audit Assessment'}
                            </p>
                        </div>
                        <div className="card-body">
                            <div className="row text-center">
                                <div className="col-md-4">
                                    <div className="border-end">
                                        <h4 className="text-danger">{riskStats.high}</h4>
                                        <p className="text-muted small mb-0">High Risk Items</p>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="border-end">
                                        <h4 className="text-warning">{riskStats.medium}</h4>
                                        <p className="text-muted small mb-0">Medium Risk Items</p>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <h4 className="text-success">{riskStats.low}</h4>
                                    <p className="text-muted small mb-0">Low Risk Items</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Results */}
                    <div className="card">
                        <div className="card-header">
                            <h4 className="card-title mb-0">
                                <i className="bi bi-list-check me-2"></i>
                                Detailed Analysis ({totalAnswers} Questions)
                            </h4>
                        </div>
                        <div className="card-body">
                            {submission.answers && submission.answers.length > 0 ? (
                                <div className="row">
                                    {submission.answers.map((answer, index) => (
                                        <div key={answer.id || index} className="col-12 mb-4">
                                            <div className="card border-0 shadow-sm">
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                                        <div className="flex-grow-1">
                                                            <h6 className="card-title mb-2">
                                                                <span className="badge bg-primary me-2">{index + 1}</span>
                                                                {answer.question?.question || 'Question not available'}
                                                            </h6>
                                                            {answer.question?.description && (
                                                                <p className="text-muted small mb-2">
                                                                    {answer.question.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className={`badge ${getRiskLevelClass(answer.risk_level)} ms-3`}>
                                                            {getRiskIcon(answer.risk_level)} {answer.risk_level?.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="mb-3">
                                                        <strong className="text-primary">Your Answer:</strong>
                                                        <span className="ms-2 badge bg-light text-dark">{answer.answer}</span>
                                                    </div>

                                                    {answer.recommendation && (
                                                        <div className="alert alert-info mb-0">
                                                            <strong><i className="bi bi-lightbulb me-1"></i>Recommendation:</strong>
                                                            <div className="mt-1">{answer.recommendation}</div>
                                                        </div>
                                                    )}

                                                    {/* Show risk criteria if available */}
                                                    {answer.question?.risk_criteria && (
                                                        <div className="mt-3">
                                                            <details className="text-muted small">
                                                                <summary className="cursor-pointer">View Risk Criteria</summary>
                                                                <div className="mt-2 ps-3">
                                                                    {answer.question.risk_criteria.high && (
                                                                        <p className="mb-1">
                                                                            <strong className="text-danger">🔴 High:</strong> {answer.question.risk_criteria.high}
                                                                        </p>
                                                                    )}
                                                                    {answer.question.risk_criteria.medium && (
                                                                        <p className="mb-1">
                                                                            <strong className="text-warning">🟡 Medium:</strong> {answer.question.risk_criteria.medium}
                                                                        </p>
                                                                    )}
                                                                    {answer.question.risk_criteria.low && (
                                                                        <p className="mb-0">
                                                                            <strong className="text-success">🟢 Low:</strong> {answer.question.risk_criteria.low}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </details>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="bi bi-inbox display-4 text-muted"></i>
                                    <p className="text-muted mt-2">No answers found for this submission.</p>
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