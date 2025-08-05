import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ManageSubmissions = () => {
    const { user, isAdmin, authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!authLoading && (!user || !isAdmin)) {
            navigate('/login');
            return;
        }
    }, [user, isAdmin, navigate, authLoading]);

    const [submissions, setSubmissions] = useState([]);
    const [filteredSubmissions, setFilteredSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingSubmissionDetails, setIsLoadingSubmissionDetails] = useState(false); // For right panel loading
    const [error, setError] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [editingAnswer, setEditingAnswer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [riskFilter, setRiskFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date_desc');
    const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
    const [summaryText, setSummaryText] = useState('');
    const [isLoadingAnswer, setIsLoadingAnswer] = useState(false); // New state for answer-level loading

    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const response = await api.get('/audit-submissions');
            
            if (response.data) {
                const mappedSubmissions = response.data.map(submission => ({
                    ...submission,
                    effective_overall_risk: submission.admin_overall_risk || submission.system_overall_risk || 'pending',
                    review_progress: submission.review_progress || 0
                }));
                
                setSubmissions(mappedSubmissions);
                setError(null);
            } else {
                setSubmissions([]);
                setError('No submissions found.');
            }
        } catch (err) {
            console.error('Error fetching submissions:', err);
            setSubmissions([]);
            
            if (err.response?.status === 403) {
                setError('Access denied. You do not have permission to view audit submissions.');
            } else if (err.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
                localStorage.removeItem('token');
                navigate('/login');
            } else if (err.response?.status === 422) {
                setError(err.response.data.message || 'Validation error occurred.');
            } else {
                setError(
                    err.response?.data?.message || 
                    err.message || 
                    'Failed to load submissions. Please try again later.'
                );
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (!authLoading && user && isAdmin) {
            fetchSubmissions();
        } else if (!authLoading && (!user || !isAdmin)) {
            setError('You do not have permission to access this page.');
            setLoading(false);
        }
    }, [user, isAdmin, authLoading, fetchSubmissions]);

    const filterAndSortSubmissions = useCallback(() => {
        let filtered = submissions.filter(submission => {
            const matchesSearch = submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                submission.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                submission.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
            const matchesRisk = riskFilter === 'all' || submission.effective_overall_risk === riskFilter;
            return matchesSearch && matchesStatus && matchesRisk;
        });

        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'date_asc':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'risk_desc':
                    const riskOrder = { high: 3, medium: 2, low: 1, pending: 0 };
                    return riskOrder[b.effective_overall_risk] - riskOrder[a.effective_overall_risk];
                case 'progress_desc':
                    return b.review_progress - a.review_progress;
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        setFilteredSubmissions(filtered);
    }, [submissions, searchTerm, statusFilter, riskFilter, sortBy]);

    useEffect(() => {
        filterAndSortSubmissions();
    }, [filterAndSortSubmissions]);

    const fetchSubmissionDetails = async (submissionId) => {
        try {
            setIsLoadingSubmissionDetails(true); // Only right panel loading
            const response = await api.get(`/audit-submissions/${submissionId}`);
            const submission = response.data;
            if (typeof submission !== 'object' || submission === null || !('id' in submission)) {
                throw new Error('Invalid submission data received');
            }
            const transformedSubmission = {
                ...submission,
                answers: submission.answers.map(answer => {
                    const recommendation = answer.recommendation?.trim() || 'Default: Review required to address potential security concerns.';
                    return {
                        ...answer,
                        recommendation,
                        effective_risk_level: answer.admin_risk_level || answer.system_risk_level || 'pending',
                        isReviewed: Boolean(
                            answer.reviewed_by && 
                            answer.admin_risk_level && 
                            recommendation
                        )
                    };
                }),
                effective_overall_risk: submission.admin_overall_risk || submission.system_overall_risk || 'pending',
                review_progress: calculateReviewProgress(submission.answers)
            };
            setSelectedSubmission(transformedSubmission);
            setError(null);

            // Update progress in submissions/filteredSubmissions for left panel
            setSubmissions(prevSubs => prevSubs.map(s =>
                s.id === transformedSubmission.id
                    ? { ...s, review_progress: transformedSubmission.review_progress, effective_overall_risk: transformedSubmission.effective_overall_risk }
                    : s
            ));
            setFilteredSubmissions(prevFiltered => prevFiltered.map(s =>
                s.id === transformedSubmission.id
                    ? { ...s, review_progress: transformedSubmission.review_progress, effective_overall_risk: transformedSubmission.effective_overall_risk }
                    : s
            ));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load submission details.');
            setSelectedSubmission(null);
        } finally {
            setIsLoadingSubmissionDetails(false);
        }
    };

    const calculateReviewProgress = (answers) => {
        if (!answers || answers.length === 0) return 0;
        const reviewedCount = answers.filter(answer => 
            answer.reviewed_by && answer.admin_risk_level
        ).length;
        return (reviewedCount / answers.length) * 100;
    };

    const handleAnswerReview = async (answerId, adminRiskLevel, adminNotes, recommendation) => {
        try {
            setIsLoadingAnswer(true); // Start loading for this answer
            if (!adminRiskLevel || !recommendation) {
                setError('Risk level and recommendation are required');
                return;
            }

            const response = await api.put(
                `/audit-submissions/${selectedSubmission.id}/answers/${answerId}/review`,
                {
                    admin_risk_level: adminRiskLevel,
                    admin_notes: adminNotes || '',
                    recommendation: recommendation || ''
                }
            );

            if (response.data && typeof response.data === 'object') {
                await fetchSubmissionDetails(selectedSubmission.id); // Update only the submission details
                setEditingAnswer(null);
                setError(null);
            } else {
                throw new Error('Invalid response data');
            }
        } catch (err) {
            console.error('Error reviewing answer:', err);
            setError(
                err.response?.status === 500
                    ? 'Server error while reviewing answer. Please try again.'
                    : err.response?.status === 422
                    ? err.response.data.message || 'Validation error in answer review.'
                    : err.response?.data?.message || 'Failed to update answer review.'
            );
            
            if (err.response?.status === 500) {
                console.error('Server Error Details:', {
                    status: err.response.status,
                    data: err.response.data,
                    answerId,
                    submissionId: selectedSubmission.id
                });
            }
        } finally {
            setIsLoadingAnswer(false); // Stop loading
        }
    };

    const calculateOverallRisk = (answers) => {
        if (!answers || answers.length === 0) {
            return 'low';
        }

        const riskLevels = answers.map(answer => 
            answer.admin_risk_level || answer.system_risk_level || 'low'
        );

        const riskCounts = {
            high: riskLevels.filter(r => r === 'high').length,
            medium: riskLevels.filter(r => r === 'medium').length,
            low: riskLevels.filter(r => r === 'low').length
        };

        if (riskCounts.high > 0) {
            return 'high';
        } else if (riskCounts.medium > Math.floor(answers.length * 0.3)) {
            return 'medium';
        } else {
            return 'low';
        }
    };

    const handleCompleteReview = async () => {
        try {
            if (!selectedSubmission.answers || selectedSubmission.answers.length === 0) {
                setError('No answers found to review.');
                return;
            }

            const pendingAnswers = selectedSubmission.answers.filter(answer => 
                !answer.reviewed_by || !answer.admin_risk_level || !answer.admin_notes
            );
            
            if (pendingAnswers.length > 0) {
                setError('All answers must be fully reviewed (including risk level and notes) before completing the review.');
                return;
            }

            if (!summaryText.trim()) {
                setError('Please provide a summary before completing the review.');
                return;
            }

            const calculatedRisk = calculateOverallRisk(selectedSubmission.answers);
            
            const payload = {
                admin_overall_risk: calculatedRisk,
                admin_summary: summaryText.trim()
            };

            console.log('Sending payload:', payload);

            const response = await api.put(
                `/audit-submissions/${selectedSubmission.id}/complete`,
                payload
            );

            console.log('Server response:', response);

            if (!response.data || !response.data.submission) {
                throw new Error('Invalid server response');
            }

            const savedSubmission = response.data.submission;
            if (savedSubmission.admin_overall_risk !== calculatedRisk || 
                savedSubmission.admin_summary !== summaryText.trim()) {
                throw new Error('Data verification failed');
            }

            setError(null);
            setSelectedRiskLevel('');
            setSummaryText('');
            // Reload the whole page after completing review
            window.location.reload();
        } catch (err) {
            console.error('Error completing review:', err);
            setError(
                err.response?.status === 400
                    ? 'Cannot complete review. Some answers are still pending.'
                    : err.response?.status === 422
                    ? 'Validation error in final review.'
                    : err.response?.data?.message || 'Failed to complete review.'
            );
        }
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'high': return 'text-danger bg-danger bg-opacity-10 border-danger';
            case 'medium': return 'text-warning bg-warning bg-opacity-10 border-warning';
            case 'low': return 'text-success bg-success bg-opacity-10 border-success';
            case 'pending': return 'text-secondary bg-light border-secondary';
            default: return 'text-muted bg-light border-secondary';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return 'text-muted bg-light';
            case 'submitted': return 'text-primary bg-primary bg-opacity-10';
            case 'under_review': return 'text-warning bg-warning bg-opacity-10';
            case 'completed': return 'text-success bg-success bg-opacity-10';
            default: return 'text-muted bg-light';
        }
    };

    const getRiskIcon = (risk) => {
        switch (risk) {
            case 'high': return <i className="bi bi-exclamation-octagon me-1"></i>;
            case 'medium': return <i className="bi bi-exclamation-triangle me-1"></i>;
            case 'low': return <i className="bi bi-check-circle me-1"></i>;
            case 'pending': return <i className="bi bi-clock me-1"></i>;
            default: return <i className="bi bi-info-circle me-1"></i>;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStats = () => {
        const total = filteredSubmissions.length;
        const pending = filteredSubmissions.filter(s => s.status === 'submitted').length;
        const underReview = filteredSubmissions.filter(s => s.status === 'under_review').length;
        const completed = filteredSubmissions.filter(s => s.status === 'completed').length;
        const highRisk = filteredSubmissions.filter(s => s.effective_overall_risk === 'high').length;
        
        return { total, pending, underReview, completed, highRisk };
    };

    if (authLoading) {
        return (
            <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100 bg-light">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted fw-bold">Loading Submissions Management...</h5>
                    <p className="text-muted small">Please wait while we fetch your data</p>
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="container py-4">
                <div className="alert alert-warning">
                    <h4 className="alert-heading fw-bold">Access Denied</h4>
                    <p className="text-muted">You must be logged in as an admin to access this page.</p>
                    <a href="/login" className="btn btn-primary">Go to Login</a>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container-fluid d-flex align-items-center justify-content-center min-vh-100 bg-light">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted fw-bold">Loading Submissions...</h5>
                    <p className="text-muted small">Please wait while we fetch your data</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-4">
                <div className="alert alert-danger">
                    <h4 className="alert-heading fw-bold">Error Loading Submissions</h4>
                    <p className="text-muted">{error}</p>
                    <button 
                        className="btn btn-outline-danger" 
                        onClick={() => {
                            setError(null);
                            fetchSubmissions();
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    const stats = getStats();

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">
            <div className="row mb-4">
                <div className="col">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h1 className="h3 mb-2 fw-bold">Audit Submissions Management</h1>
                                    <p className="text-muted mb-0">Review and assess security audit submissions</p>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="badge bg-primary">Total: {stats.total}</span>
                                    <span className="badge bg-warning">Pending: {stats.pending}</span>
                                    <span className="badge bg-info">Under Review: {stats.underReview}</span>
                                    <span className="badge bg-success">Completed: {stats.completed}</span>
                                    <span className="badge bg-danger">High Risk: {stats.highRisk}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header bg-white border-bottom">
                            <div className="row g-2">
                                <div className="col-12">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0">
                                            <i className="bi bi-search"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control border-start-0"
                                            placeholder="Search submissions..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            aria-label="Search submissions"
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <select
                                        className="form-select form-select-sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        aria-label="Filter by status"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="submitted">Submitted</option>
                                        <option value="under_review">Under Review</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div className="col-md-6">
                                    <select
                                        className="form-select form-select-sm"
                                        value={riskFilter}
                                        onChange={(e) => setRiskFilter(e.target.value)}
                                        aria-label="Filter by risk level"
                                    >
                                        <option value="all">All Risk Levels</option>
                                        <option value="high">High Risk</option>
                                        <option value="medium">Medium Risk</option>
                                        <option value="low">Low Risk</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                                <div className="col-12">
                                    <select
                                        className="form-select form-select-sm"
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        aria-label="Sort submissions"
                                    >
                                        <option value="date_desc">Newest First</option>
                                        <option value="date_asc">Oldest First</option>
                                        <option value="risk_desc">Highest Risk First</option>
                                        <option value="progress_desc">Most Progress</option>
                                        <option value="title">Title A-Z</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="card-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {filteredSubmissions.length === 0 ? (
                                <div className="text-center py-5">
                                    <i className="bi bi-file-text fs-1 text-muted mb-3"></i>
                                    <h5 className="text-muted fw-bold">No submissions found</h5>
                                    <p className="text-muted">Try adjusting your search or filters</p>
                                </div>
                            ) : (
                                <table className="table table-hover align-middle mb-0">
                                    <tbody>
                                        {filteredSubmissions.map((submission, index) => (
                                            <tr
                                                key={submission.id}
                                                className={`cursor-pointer ${selectedSubmission?.id === submission.id ? 'table-primary' : ''}`}
                                                onClick={() => fetchSubmissionDetails(submission.id)}
                                            >
                                                <td className="p-3">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div className="flex-grow-1 min-w-0">
                                                            <h6 className="mb-1 text-truncate fw-bold">{submission.title}</h6>
                                                            <div className="small text-muted mb-2">
                                                                <div className="d-flex align-items-center mb-1">
                                                                    <i className="bi bi-person me-1"></i>
                                                                    <span className="text-truncate">{submission.user?.name || submission.user?.email}</span>
                                                                </div>
                                                                <div className="d-flex align-items-center">
                                                                    <i className="bi bi-calendar me-1"></i>
                                                                    <span>{formatDate(submission.created_at)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex align-items-center justify-content-between">
                                                                <span className={`badge ${getStatusColor(submission.status)}`}>
                                                                    {submission.status.replace('_', ' ').toUpperCase()}
                                                                </span>
                                                                {submission.review_progress > 0 && (
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="progress me-2" style={{ width: '60px', height: '4px' }}>
                                                                            <div 
                                                                                className="progress-bar bg-info" 
                                                                                style={{ width: `${submission.review_progress}%` }}
                                                                            ></div>
                                                                        </div>
                                                                        <small className="text-muted">{Math.round(submission.review_progress)}%</small>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="ms-2">
                                                            <span className={`badge ${getRiskColor(submission.effective_overall_risk)}`}>
                                                                {getRiskIcon(submission.effective_overall_risk)}
                                                                {submission.effective_overall_risk.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-8">
                    {isLoadingSubmissionDetails ? (
                        <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                <h5 className="text-muted fw-bold">Loading Submission Details...</h5>
                            </div>
                        </div>
                    ) : selectedSubmission ? (
                        <SubmissionDetails
                            submission={selectedSubmission}
                            onAnswerReview={handleAnswerReview}
                            onCompleteReview={handleCompleteReview}
                            editingAnswer={editingAnswer}
                            setEditingAnswer={setEditingAnswer}
                            getRiskColor={getRiskColor}
                            getRiskIcon={getRiskIcon}
                            formatDate={formatDate}
                            calculateOverallRisk={calculateOverallRisk}
                            fetchSubmissionDetails={fetchSubmissionDetails}
                            isLoadingAnswer={isLoadingAnswer}
                        />
                    ) : (
                        <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                                <i className="bi bi-graph-up fs-1 text-muted mb-3"></i>
                                <h4 className="text-muted fw-bold">Select a Submission</h4>
                                <p className="text-muted">Choose a submission from the list to view and assess its details.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AnswerReviewForm = ({ 
    adminRiskLevel, 
    setAdminRiskLevel, 
    adminNotes, 
    setAdminNotes, 
    recommendation, 
    setRecommendation, 
    onSave, 
    onCancel, 
    getRiskColor 
}) => {
    const [error, setError] = useState('');

    const riskOptions = [
        { value: 'low', label: 'Low Risk', description: 'Minimal security impact' },
        { value: 'medium', label: 'Medium Risk', description: 'Moderate security concern' },
        { value: 'high', label: 'High Risk', description: 'Significant security risk' }
    ];

    const handleSave = () => {
        if (!adminRiskLevel) {
            setError('Please select a risk level');
            return;
        }
        if (!recommendation.trim()) {
            setError('Please provide a recommendation');
            return;
        }
        if (recommendation.trim().length < 5) {
            setError('Recommendation must be at least 5 characters long');
            return;
        }
        
        setError('');
        onSave(adminRiskLevel, adminNotes.trim(), recommendation.trim());
    };

    return (
        <div className="border border-primary rounded p-3 bg-primary bg-opacity-10">
            <h6 className="text-primary mb-3 fw-bold">
                <i className="bi bi-pencil-fill me-1"></i>
                Risk Assessment
            </h6>

            {error && (
                <div className="alert alert-danger mb-3">
                    <i className="bi bi-info-circle me-2"></i>
                    {error}
                </div>
            )}
            
            <div className="row">
                <div className="col-md-6">
                    <label className="form-label fw-semibold text-muted">Risk Level</label>
                    <div className="d-grid gap-2">
                        {riskOptions.map((option) => (
                            <div key={option.value} className="form-check">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="riskLevel"
                                    id={`risk-${option.value}`}
                                    value={option.value}
                                    checked={adminRiskLevel === option.value}
                                    onChange={(e) => {
                                        setAdminRiskLevel(e.target.value);
                                        setError('');
                                    }}
                                    aria-label={`Select ${option.label}`}
                                />
                                <label className="form-check-label d-flex align-items-center" htmlFor={`risk-${option.value}`}>
                                    <span className={`badge ${getRiskColor(option.value)} me-2`}>
                                        {option.label}
                                    </span>
                                    <small className="text-muted">{option.description}</small>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="col-md-6">
                    <div className="mb-3">
                        <label className="form-label fw-semibold text-muted">Admin Notes</label>
                        <textarea
                            className="form-control"
                            rows={3}
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Internal notes about this assessment..."
                            aria-label="Admin notes"
                        />
                        <div className="form-text text-muted">These notes are for internal review purposes.</div>
                    </div>
                </div>
            </div>

            <div className="mb-3">
                <label className="form-label fw-semibold text-muted">Recommendation</label>
                <textarea
                    className="form-control"
                    rows={3}
                    value={recommendation}
                    onChange={(e) => {
                        setRecommendation(e.target.value);
                        setError('');
                    }}
                    placeholder="Recommendations for addressing this issue..."
                    aria-label="Recommendation"
                />
                <div className="form-text text-muted">Provide actionable recommendations for the user.</div>
            </div>

            <div className="d-flex justify-content-end gap-2">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onCancel}
                    aria-label="Cancel assessment"
                >
                    <i className="bi bi-x me-1"></i>
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    aria-label="Save assessment"
                >
                    <i className="bi bi-save me-1"></i>
                    Save Assessment
                </button>
            </div>
        </div>
    );
};

const RiskConfirmationModal = ({ 
    show, 
    onClose, 
    onConfirm, 
    message,
    isSubmitting 
}) => {
    if (!show) return null;

    return (
        <>
            <div className="modal fade show" 
                style={{ display: 'block' }}
                tabIndex="-1" 
                role="dialog"
                aria-labelledby="riskConfirmationModal"
                aria-hidden="false"
            >
                <div className="modal-dialog modal-dialog-centered border-0 shadow-sm">
                    <div className="modal-content">
                        <div className="modal-header bg-white">
                            <h5 className="modal-title fw-bold" id="riskConfirmationModal">Confirm Risk Assessment</h5>
                            <button type="button" 
                                className="btn-close" 
                                onClick={onClose}
                                aria-label="Close"
                            ></button>
                        </div>
                        <div className="modal-body">
                            <div className="alert alert-warning">
                                <i className="bi bi-exclamation-triangle me-2"></i>
                                {message}
                            </div>
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="button" 
                                className="btn btn-secondary" 
                                onClick={onClose}
                                aria-label="Cancel confirmation"
                            >
                                Cancel
                            </button>
                            <button type="button" 
                                className="btn btn-primary" 
                                onClick={onConfirm}
                                disabled={isSubmitting}
                                aria-label="Confirm assessment"
                            >
                                {isSubmitting ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" />
                                        Confirming...
                                    </>
                                ) : (
                                    'Confirm Assessment'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="modal-backdrop fade show"></div>
        </>
    );
};

const FinalReviewForm = ({ 
    adminOverallRisk, 
    setAdminOverallRisk, 
    adminSummary, 
    setAdminSummary, 
    onSubmit, 
    onCancel,
    submission 
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState('');
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');

    const riskOptions = [
        { value: 'low', label: 'Low Risk', description: 'Minimal security impact', color: 'success' },
        { value: 'medium', label: 'Medium Risk', description: 'Moderate security concern', color: 'warning' },
        { value: 'high', label: 'High Risk', description: 'Significant security risk', color: 'danger' }
    ];

    const needsConfirmation = (selectedRisk) => {
        if (!submission?.answers) return false;

        const riskCounts = submission.answers.reduce((acc, answer) => {
            const risk = answer.admin_risk_level || answer.system_risk_level || 'low';
            acc[risk] = (acc[risk] || 0) + 1;
            return acc;
        }, {});

        const total = submission.answers.length;
        const percentages = Object.keys(riskCounts).reduce((acc, risk) => {
            acc[risk] = (riskCounts[risk] / total) * 100;
            return acc;
        }, {});

        console.log('Risk Distribution:', {
            selectedRisk,
            riskCounts,
            percentages,
            totalAnswers: total
        });

        if (selectedRisk === 'high' && percentages['low'] >= 70) {
            setConfirmationMessage(
                'You are setting a HIGH overall risk level, but more than 70% of the answers are assessed as LOW risk. ' +
                'Are you sure you want to proceed with this assessment?'
            );
            return true;
        }

        if (selectedRisk === 'low' && (percentages['high'] >= 30 || percentages['medium'] >= 50)) {
            setConfirmationMessage(
                'You are setting a LOW overall risk level, but there are significant MEDIUM or HIGH risk answers ' +
                `(High: ${percentages['high']?.toFixed(1) || 0}%, Medium: ${percentages['medium']?.toFixed(1) || 0}%). ` +
                'Are you sure you want to proceed with this assessment?'
            );
            return true;
        }

        return false;
    };

    const handleSubmit = async () => {
        try {
            setValidationError('');
            setIsSubmitting(true);

            if (!adminOverallRisk) {
                setValidationError('Please select a risk level');
                return;
            }

            if (!adminSummary.trim()) {
                setValidationError('Please provide an executive summary');
                return;
            }

            if (needsConfirmation(adminOverallRisk)) {
                setShowConfirmationModal(true);
                return;
            }

            await onSubmit();
            // Reload the page after successful completion
            window.location.reload();
        } catch (error) {
            console.error('Submit error:', error);
            setValidationError(error.message || 'Failed to complete review');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirm = async () => {
        try {
            setIsSubmitting(true);
            await onSubmit();
            setShowConfirmationModal(false);
            // Reload the page after successful confirmation
            window.location.reload();
        } catch (error) {
            console.error('Confirm error:', error);
            setValidationError(error.message || 'Failed to complete review');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="mt-3 p-3 border rounded bg-light">
                <h6 className="mb-3 fw-bold">Final Risk Assessment</h6>
                
                {validationError && (
                    <div className="alert alert-danger mb-3">
                        <i className="bi bi-info-circle me-2"></i>
                        {validationError}
                    </div>
                )}

                <div className="row">
                    <div className="col-md-6">
                        <label className="form-label fw-semibold text-muted">Overall Risk Level</label>
                        <div className="d-grid gap-2">
                            {riskOptions.map((option) => (
                                <div key={option.value} className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        name="overallRisk"
                                        id={`overall-risk-${option.value}`}
                                        value={option.value}
                                        checked={adminOverallRisk === option.value}
                                        onChange={(e) => {
                                            setAdminOverallRisk(e.target.value);
                                            setValidationError('');
                                        }}
                                        aria-label={`Select ${option.label}`}
                                    />
                                    <label className="form-check-label" htmlFor={`overall-risk-${option.value}`}>
                                        <span className={`badge bg-${option.color} me-2`}>
                                            {option.label}
                                        </span>
                                        <small className="text-muted">{option.description}</small>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="col-md-6">
                        <label className="form-label fw-semibold text-muted">Executive Summary</label>
                        <textarea
                            className="form-control"
                            rows={4}
                            value={adminSummary}
                            onChange={(e) => {
                                setAdminSummary(e.target.value);
                                setValidationError('');
                            }}
                            placeholder="Provide an overall assessment and key recommendations..."
                            required
                            aria-label="Executive summary"
                        />
                    </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        aria-label="Cancel final review"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !adminOverallRisk || !adminSummary.trim()}
                        aria-label="Complete review"
                    >
                        {isSubmitting ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Completing Review...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-square-fill me-1"></i>
                                Complete Review
                            </>
                        )}
                    </button>
                </div>
            </div>

            <RiskConfirmationModal
                show={showConfirmationModal}
                onClose={() => {
                    setShowConfirmationModal(false);
                    setIsSubmitting(false);
                }}
                onConfirm={handleConfirm}
                message={confirmationMessage}
                isSubmitting={isSubmitting}
            />
        </>
    );
};

const SubmissionDetails = ({ 
    submission, 
    onAnswerReview, 
    onCompleteReview,
    editingAnswer,
    setEditingAnswer,
    getRiskColor,
    getRiskIcon,
    formatDate,
    calculateOverallRisk,
    fetchSubmissionDetails,
    isLoadingAnswer
}) => {
    const [finalReviewMode, setFinalReviewMode] = useState(false);
    const [adminOverallRisk, setAdminOverallRisk] = useState('');
    const [adminSummary, setAdminSummary] = useState('');
    const [error, setError] = useState(null);

    const canFinalize = useMemo(() => {
        const hasAnswers = submission.answers?.length > 0;
        const isUnderReview = submission.status === 'under_review';
        
        const allReviewed = submission.answers?.every(answer => {
            const isValid = answer.reviewed_by && 
                        answer.admin_risk_level && 
                        answer.recommendation?.trim();
            
            if (!isValid) {
                console.log('Unreviewed Answer:', {
                    id: answer.id,
                    reviewed_by: answer.reviewed_by,
                    admin_risk_level: answer.admin_risk_level,
                    recommendation: answer.recommendation,
                    recommendation_length: answer.recommendation?.length,
                    isValid
                });
            }
            return isValid;
        });

        console.log('canFinalize Check:', {
            hasAnswers,
            isUnderReview,
            allReviewed,
            answers: submission.answers?.map(a => ({
                id: a.id,
                reviewed_by: Boolean(a.reviewed_by),
                hasRiskLevel: Boolean(a.admin_risk_level),
                hasRecommendation: Boolean(a.recommendation?.trim()),
                recommendation: a.recommendation
            }))
        });

        return isUnderReview && hasAnswers && allReviewed;
    }, [submission]);

    useEffect(() => {
        console.log('Submission Status:', submission.status);
        console.log('Can Finalize:', canFinalize);
        console.log('Final Review Mode:', finalReviewMode);
        console.log('All Answers Reviewed:', submission.answers?.every(answer => answer.reviewed_by));
    }, [submission, canFinalize, finalReviewMode]);

    useEffect(() => {
        setFinalReviewMode(false);
        setAdminOverallRisk('');
        setAdminSummary('');
        setError(null);
    }, [submission.id]);

    useEffect(() => {
        console.log('Submission Answers Updated:', {
            answersCount: submission.answers?.length,
            answers: submission.answers?.map(answer => ({
                id: answer.id,
                reviewed_by: answer.reviewed_by,
                admin_risk_level: answer.admin_risk_level,
                recommendation: answer.recommendation,
                isFullyReviewed: Boolean(
                    answer.reviewed_by && 
                    answer.admin_risk_level && 
                    answer.recommendation
                )
            }))
        });
    }, [submission.answers]);

    useEffect(() => {
        console.log('canFinalize changed:', canFinalize, {
            status: submission.status,
            hasAnswers: submission.answers?.length > 0,
            allReviewed: submission.answers?.every(a => 
                a.reviewed_by && 
                a.admin_risk_level && 
                a.recommendation
            ),
            answerDetails: submission.answers?.map(a => ({
                id: a.id,
                reviewed_by: Boolean(a.reviewed_by),
                hasRiskLevel: Boolean(a.admin_risk_level),
                hasRecommendation: Boolean(a.recommendation)
            }))
        });
    }, [canFinalize, submission]);

    const handleAnswerReview = async (answerId, adminRiskLevel, adminNotes, recommendation) => {
        try {
            if (!adminRiskLevel || !recommendation?.trim()) {
                setError('Risk level and recommendation are required');
                return;
            }

            await onAnswerReview(answerId, adminRiskLevel, adminNotes || '', recommendation || '');
            await fetchSubmissionDetails(submission.id);
            setEditingAnswer(null);
            setError(null);

            console.log('Answer review completed successfully:', {
                answerId,
                adminRiskLevel,
                recommendationLength: recommendation?.length
            });
        } catch (err) {
            console.error('Error reviewing answer:', err);
            setError(
                err.response?.status === 500
                    ? 'Server error while reviewing answer. Please try again.'
                    : err.response?.status === 422
                    ? err.response.data.message || 'Validation error in answer review.'
                    : err.response?.data?.message || 'Failed to update answer review.'
            );
        }
    };

    return (
        <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <h4 className="mb-2 fw-bold">{submission.title}</h4>
                        <div className="d-flex align-items-center text-muted small">
                            <div className="me-4">
                                <i className="bi bi-person me-1"></i>
                                {submission.user?.name || submission.user?.email}
                            </div>
                            <div className="me-4">
                                <i className="bi bi-calendar me-1"></i>
                                {formatDate(submission.created_at)}
                            </div>
                            {submission.reviewed_at && (
                                <div>
                                    <i className="bi bi-check-square-fill me-1"></i>
                                    Reviewed {formatDate(submission.reviewed_at)}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-end">
                        <span className={`badge fs-6 ${getRiskColor(submission.effective_overall_risk)}`}>
                            {getRiskIcon(submission.effective_overall_risk)}
                            Overall Risk: {submission.effective_overall_risk.toUpperCase()}
                        </span>
                        {submission.review_progress !== undefined && (
                            <div className="mt-2">
                                <div className="progress" style={{ height: '6px', width: '150px' }}>
                                    <div 
                                        className="progress-bar bg-info" 
                                        style={{ width: `${submission.review_progress}%` }}
                                    ></div>
                                </div>
                                <small className="text-muted">{Math.round(submission.review_progress)}% reviewed</small>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card-body">
                {error && (
                    <div className="alert alert-danger mb-4">
                        <div className="d-flex align-items-center">
                            <i className="bi bi-info-circle me-2"></i>
                            {error}
                        </div>
                    </div>
                )}

                {(canFinalize || submission.status === 'completed') && (
                    <div className="alert alert-info mb-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="alert-heading mb-1 fw-bold">Final Review</h6>
                                <p className="mb-0 text-muted">
                                    {submission.status === 'completed' 
                                        ? 'This submission has been completed.'
                                        : 'All answers have been reviewed. Ready for final assessment.'
                                    }
                                </p>
                            </div>
                            {submission.status !== 'completed' && (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => {
                                        console.log('Final Review Toggle:', {
                                            currentMode: finalReviewMode,
                                            newMode: !finalReviewMode,
                                            canFinalize,
                                            submissionStatus: submission.status,
                                            answersCount: submission.answers?.length,
                                            answersReviewed: submission.answers?.every(a => 
                                                a.reviewed_by && 
                                                a.admin_risk_level && 
                                                a.recommendation
                                            ),
                                            answers: submission.answers?.map(a => ({
                                                id: a.id,
                                                adminRisk: a.admin_risk_level,
                                                systemRisk: a.system_risk_level
                                            }))
                                        });

                                        setFinalReviewMode(!finalReviewMode);
                                        
                                        if (!finalReviewMode) {
                                            const calculatedRisk = calculateOverallRisk(submission.answers);
                                            console.log('Setting initial risk level:', {
                                                calculatedRisk,
                                                answers: submission.answers?.map(a => ({
                                                    id: a.id,
                                                    adminRisk: a.admin_risk_level,
                                                    systemRisk: a.system_risk_level
                                                }))
                                            });
                                            setAdminOverallRisk(calculatedRisk);
                                        } else {
                                            console.log('Resetting review state');
                                            setAdminOverallRisk('');
                                            setAdminSummary('');
                                        }
                                    }}
                                    aria-label={finalReviewMode ? 'Cancel final review' : 'Finalize review'}
                                >
                                    {finalReviewMode ? (
                                        <>
                                            <i className="bi bi-x me-1"></i>
                                            Cancel Review
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-check-square-fill me-1"></i>
                                            Finalize Review
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                        
                        {finalReviewMode && (
                            <div className="mt-3">
                                <FinalReviewForm
                                    adminOverallRisk={adminOverallRisk}
                                    setAdminOverallRisk={setAdminOverallRisk}
                                    adminSummary={adminSummary}
                                    setAdminSummary={setAdminSummary}
                                    submission={submission}
                                    onSubmit={async () => {
                                        try {
                                            const response = await api.put(
                                                `/audit-submissions/${submission.id}/complete`,
                                                {
                                                    admin_overall_risk: adminOverallRisk,
                                                    admin_summary: adminSummary.trim()
                                                }
                                            );

                                            if (response.data?.submission) {
                                                await fetchSubmissionDetails(submission.id);
                                                setFinalReviewMode(false);
                                                setAdminOverallRisk('');
                                                setAdminSummary('');
                                                setError(null);
                                            } else {
                                                throw new Error('Invalid response format');
                                            }
                                        } catch (err) {
                                            throw new Error(
                                                err.response?.data?.message || 
                                                'Failed to complete review. Please ensure all answers are reviewed.'
                                            );
                                        }
                                    }}
                                    onCancel={() => {
                                        setFinalReviewMode(false);
                                        setAdminOverallRisk('');
                                        setAdminSummary('');
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {submission.admin_summary && (
                    <div className="alert alert-success mb-4">
                        <h6 className="alert-heading fw-bold">Admin Summary</h6>
                        <p className="mb-0 text-muted">{submission.admin_summary}</p>
                        {submission.reviewer && (
                            <small className="text-muted">
                                Reviewed by {submission.reviewer.name || submission.reviewer.email}
                            </small>
                        )}
                    </div>
                )}

                <h5 className="mb-3 fw-bold">Audit Answers</h5>
                <div className="accordion" id="answersAccordion">
                    {submission.answers?.map((answer, index) => (
                        <AnswerCard
                            key={answer.id}
                            answer={answer}
                            index={index}
                            isEditing={editingAnswer === answer.id}
                            onEdit={(answerId) => setEditingAnswer(editingAnswer === answerId ? null : answerId)}
                            onSave={handleAnswerReview}
                            onCancel={() => setEditingAnswer(null)}
                            getRiskColor={getRiskColor}
                            getRiskIcon={getRiskIcon}
                            formatDate={formatDate}
                            canEdit={submission.status !== 'completed'}
                            isLoading={isLoadingAnswer} // Pass loading state to AnswerCard
                        />
                    ))}
                </div>

                {!submission.answers?.length && (
                    <div className="text-center py-4">
                        <i className="bi bi-info-circle fs-1 text-muted mb-3"></i>
                        <p className="text-muted">No answers found for this submission.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const AnswerCard = ({ answer, index, isEditing, onEdit, onSave, onCancel, getRiskColor, getRiskIcon, formatDate, canEdit }) => {
    const [adminRiskLevel, setAdminRiskLevel] = useState(answer.admin_risk_level || answer.system_risk_level || 'low');
    const [adminNotes, setAdminNotes] = useState(answer.admin_notes || '');
    const [recommendation, setRecommendation] = useState(answer.recommendation || 'Review required to address potential security concerns.');
    const [error, setError] = useState('');

    const effectiveRiskLevel = answer.admin_risk_level || answer.system_risk_level || 'pending';
    const isReviewed = Boolean(answer.reviewed_by && answer.admin_risk_level && answer.recommendation?.trim());

    const handleSave = async () => {
        try {
            if (!adminRiskLevel) {
                setError('Please select a risk level');
                return;
            }
            if (!recommendation.trim()) {
                setError('Please provide a recommendation');
                return;
            }
            const reviewData = {
                admin_risk_level: adminRiskLevel,
                admin_notes: adminNotes.trim(),
                recommendation: recommendation.trim()
            };
            await onSave(answer.id, reviewData.admin_risk_level, reviewData.admin_notes, reviewData.recommendation);
            setError('');
        } catch (error) {
            console.error('Failed to save review:', error);
            setError(error.response?.data?.message || 'Failed to save review');
        }
    };

    return (
        <div className="accordion-item">
            <h2 className="accordion-header">
                <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#answer${answer.id}`}
                    aria-expanded="false"
                    aria-controls={`answer${answer.id}`}
                >
                    <div className="d-flex justify-content-between align-items-center w-100 me-3">
                        <div className="flex-grow-1">
                            <div className="fw-bold">{answer.question?.question}</div>
                            <div className="small text-muted d-flex align-items-center gap-3">
                                <div>Category: <span className="badge bg-secondary bg-opacity-25 text-dark">{answer.question?.category}</span></div>
                                {isReviewed && (
                                    <div>
                                        <i className="bi bi-check-circle me-1"></i>
                                        Reviewed
                                    </div>
                                )}
                            </div>
                        </div>
                        <span className={`badge ${getRiskColor(effectiveRiskLevel)}`}>
                            {getRiskIcon(effectiveRiskLevel)}
                            {effectiveRiskLevel.toUpperCase()}
                        </span>
                    </div>
                </button>
            </h2>
            <div id={`answer${answer.id}`} className="accordion-collapse collapse">
                <div className="accordion-body">
                    {error && (
                        <div className="alert alert-danger mb-3">
                            <i className="bi bi-info-circle me-2"></i>
                            {error}
                        </div>
                    )}
                    <div className="mb-3">
                        <h6 className="fw-bold">User's Response:</h6>
                        <div className="p-3 bg-light rounded">
                            {answer.answer}
                        </div>
                    </div>

                    {answer.system_risk_level && (
                        <div className="mb-3">
                            <h6 className="fw-bold">System Assessment:</h6>
                            <span className={`badge ${getRiskColor(answer.system_risk_level)}`}>
                                {getRiskIcon(answer.system_risk_level)}
                                System Risk: {answer.system_risk_level.toUpperCase()}
                            </span>
                        </div>
                    )}

                    {isEditing ? (
                        <AnswerReviewForm
                            adminRiskLevel={adminRiskLevel}
                            setAdminRiskLevel={setAdminRiskLevel}
                            adminNotes={adminNotes}
                            setAdminNotes={setAdminNotes}
                            recommendation={recommendation}
                            setRecommendation={setRecommendation}
                            onSave={handleSave}
                            onCancel={onCancel}
                            getRiskColor={getRiskColor}
                        />
                    ) : (
                        <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                                {answer.admin_risk_level && (
                                    <div className="mb-2">
                                        <strong className="fw-semibold">Admin Assessment:</strong>
                                        <span className={`badge ${getRiskColor(answer.admin_risk_level)} ms-2`}>
                                            {getRiskIcon(answer.admin_risk_level)}
                                            {answer.admin_risk_level.toUpperCase()}
                                        </span>
                                    </div>
                                )}
                                {answer.admin_notes && (
                                    <div className="mb-2">
                                        <strong className="fw-semibold">Admin Notes:</strong>
                                        <p className="mb-0 mt-1 text-muted">{answer.admin_notes}</p>
                                    </div>
                                )}
                                {answer.recommendation && (
                                    <div className="mb-2">
                                        <strong className="fw-semibold">Recommendation:</strong>
                                        <p className="mb-0 mt-1 text-muted">{answer.recommendation}</p>
                                    </div>
                                )}
                                {answer.reviewed_by && (
                                    <small className="text-muted">
                                        Reviewed by {answer.reviewer?.name || answer.reviewer?.email || 'Admin'} 
                                        {answer.reviewed_at && ` on ${formatDate(answer.reviewed_at)}`}
                                    </small>
                                )}
                                {!isReviewed && (
                                    <div className="alert alert-warning alert-sm">
                                        <small><i className="bi bi-eye me-1"></i>This answer is pending admin review.</small>
                                    </div>
                                )}
                            </div>
                            {canEdit && (
                                <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => onEdit(answer.id)}
                                    aria-label={isReviewed ? 'Edit review' : 'Review answer'}
                                >
                                    <i className="bi bi-pencil-fill me-1"></i>
                                    {isReviewed ? 'Edit Review' : 'Review'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManageSubmissions;