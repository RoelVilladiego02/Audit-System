import React, { useState, useEffect, useCallback } from 'react';
import { 
    Search, 
    AlertTriangle, 
    CheckCircle, 
    AlertCircle, 
    Edit3, 
    Save, 
    X,
    Calendar,
    User,
    FileText,
    TrendingUp,
    AlertOctagon,
    Clock,
    Eye,
    CheckSquare
} from 'lucide-react';
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
    const [error, setError] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [editingAnswer, setEditingAnswer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [riskFilter, setRiskFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date_desc');
    const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
    const [summaryText, setSummaryText] = useState('');

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
                    review_progress: submission.review_progress || 0,
                    answers_count: submission.answers?.length || 0,
                    reviewed_answers_count: submission.answers?.filter(a => a.reviewed_by).length || 0
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
                                submission.user?.email.toLowerCase().includes(searchTerm.toLowerCase());
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
            const id = parseInt(submissionId, 10);
            if (isNaN(id)) {
                throw new Error('Invalid submission ID');
            }
            
            const response = await api.get(`/audit-submissions/${id}`);
            // Debug log
            console.log('API Response Raw:', JSON.stringify(response.data, null, 2));
            
            const submission = response.data;
            if (typeof submission !== 'object' || submission === null || !('id' in submission)) {
                console.error('Invalid submission data structure:', typeof submission, submission);
                throw new Error('Invalid submission data received');
            }

            const processedSubmission = {
                ...submission,
                id: Number.isInteger(submission.id) ? submission.id : parseInt(submission.id, 10),
                user_id: submission.user_id !== undefined ? parseInt(submission.user_id, 10) : null,
                reviewed_by: submission.reviewed_by !== undefined ? parseInt(submission.reviewed_by, 10) : null,
                answers: Array.isArray(submission.answers) ? submission.answers.map(answer => ({
                    ...answer,
                    id: Number.isInteger(answer.id) ? answer.id : parseInt(answer.id, 10),
                    audit_submission_id: Number.isInteger(answer.audit_submission_id) ? answer.audit_submission_id : parseInt(answer.audit_submission_id, 10),
                    audit_question_id: Number.isInteger(answer.audit_question_id) ? answer.audit_question_id : parseInt(answer.audit_question_id, 10),
                    reviewed_by: answer.reviewed_by !== undefined ? parseInt(answer.reviewed_by, 10) : null
                })) : []
            };
            console.log('Processed Submission:', processedSubmission); // Log processed data
            setSelectedSubmission(processedSubmission);
        } catch (err) {
            console.error('Error fetching submission details:', err);
            setError('Failed to load submission details.');
        }
    };

    const handleAnswerReview = async (answerId, adminRiskLevel, adminNotes, recommendation) => {
        try {
            const submissionId = parseInt(selectedSubmission.id, 10);
            const answerIdInt = parseInt(answerId, 10);
            
            if (isNaN(submissionId) || isNaN(answerIdInt)) {
                throw new Error('Invalid submission or answer ID');
            }

            const reviewPayload = {
                admin_risk_level: adminRiskLevel,
                admin_notes: adminNotes || '',
                recommendation: recommendation || ''
            };

            const url = `/audit-submissions/${submissionId}/answers/${answerIdInt}/review`;
            console.log('Review Request:', { url, method: 'PUT', payload: reviewPayload });

            const response = await api.put(url, reviewPayload, {
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                method: 'PUT' // Explicitly set method
            });

            if (response.data && typeof response.data === 'object') {
                await fetchSubmissionDetails(submissionId);
                await fetchSubmissions();
                setEditingAnswer(null);
            } else {
                throw new Error('Invalid response data');
            }
        } catch (err) {
            console.error('Error reviewing answer:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Failed to update answer review');
        }
    };

    const handleCompleteReview = async () => {
        try {
            const payload = {
                admin_overall_risk: selectedRiskLevel || 'pending',
                admin_summary: summaryText || 'No summary provided'
            };

            const response = await api.put(`/audit-submissions/${selectedSubmission.id}/complete`, payload);

            if (response.data && typeof response.data === 'object') {
                await fetchSubmissionDetails(selectedSubmission.id);
                await fetchSubmissions();
                setError(null);
            } else {
                throw new Error('Invalid response data');
            }
        } catch (err) {
            console.error('Error completing review:', err);
            setError(err.response?.data?.message || 'Failed to complete review');
        }
    };

    const handleSubmissionFinalReview = async (submissionId, adminOverallRisk, adminSummary) => {
        try {
            const payload = {
                admin_overall_risk: adminOverallRisk,
                admin_summary: adminSummary
            };

            const response = await api.put(`/audit-submissions/${submissionId}/complete`, payload);

            if (response.data) {
                await fetchSubmissions();
                await fetchSubmissionDetails(submissionId);
            }
        } catch (err) {
            console.error('Error finalizing submission review:', err);
            setError(err.response?.data?.message || 'Failed to finalize submission review');
        }
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'high': return 'text-danger bg-danger-subtle border-danger';
            case 'medium': return 'text-warning bg-warning-subtle border-warning';
            case 'low': return 'text-success bg-success-subtle border-success';
            case 'pending': return 'text-secondary bg-light border-secondary';
            default: return 'text-muted bg-light border-secondary';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return 'text-muted bg-light';
            case 'submitted': return 'text-primary bg-primary-subtle';
            case 'under_review': return 'text-warning bg-warning-subtle';
            case 'completed': return 'text-success bg-success-subtle';
            default: return 'text-muted bg-light';
        }
    };

    const getRiskIcon = (risk) => {
        switch (risk) {
            case 'high': return <AlertOctagon className="me-1" size={16} />;
            case 'medium': return <AlertTriangle className="me-1" size={16} />;
            case 'low': return <CheckCircle className="me-1" size={16} />;
            case 'pending': return <Clock className="me-1" size={16} />;
            default: return <AlertCircle className="me-1" size={16} />;
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
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="container py-4">
                <div className="alert alert-warning">
                    <h4>Access Denied</h4>
                    <p>You must be logged in as an admin to access this page.</p>
                    <a href="/login" className="btn btn-primary">Go to Login</a>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="d-flex justify-content-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading submissions...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-4">
                <div className="alert alert-danger">
                    <h4>Error Loading Submissions</h4>
                    <p>{error}</p>
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
            {/* Header */}
            <div className="row mb-4">
                <div className="col">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h1 className="card-title h3 mb-2">Audit Submissions Management</h1>
                                    <p className="text-muted mb-0">Review and assess security audit submissions</p>
                                </div>
                                <div className="d-flex align-items-center">
                                    <span className="badge bg-primary me-2">Total: {stats.total}</span>
                                    <span className="badge bg-warning me-2">Pending: {stats.pending}</span>
                                    <span className="badge bg-info me-2">Under Review: {stats.underReview}</span>
                                    <span className="badge bg-success me-2">Completed: {stats.completed}</span>
                                    <span className="badge bg-danger">High Risk: {stats.highRisk}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Left Panel - Submissions List */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm">
                        {/* Search and Filter Controls */}
                        <div className="card-header bg-white border-bottom">
                            <div className="row g-2">
                                <div className="col-12">
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0">
                                            <Search size={16} />
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control border-start-0"
                                            placeholder="Search submissions..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <select
                                        className="form-select form-select-sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
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

                        {/* Submissions List */}
                        <div className="card-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {filteredSubmissions.length === 0 ? (
                                <div className="text-center py-5">
                                    <FileText size={48} className="text-muted mb-3" />
                                    <h5 className="text-muted">No submissions found</h5>
                                    <p className="text-muted">Try adjusting your search or filters</p>
                                </div>
                            ) : (
                                filteredSubmissions.map((submission, index) => (
                                    <div
                                        key={submission.id}
                                        className={`p-3 border-bottom cursor-pointer ${
                                            selectedSubmission?.id === submission.id 
                                                ? 'bg-primary-subtle border-primary' 
                                                : 'hover-bg-light'
                                        }`}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => fetchSubmissionDetails(submission.id)}
                                    >
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="flex-grow-1 min-w-0">
                                                <h6 className="mb-1 text-truncate">{submission.title}</h6>
                                                <div className="small text-muted mb-2">
                                                    <div className="d-flex align-items-center mb-1">
                                                        <User size={12} className="me-1" />
                                                        <span className="text-truncate">{submission.user?.name || submission.user?.email}</span>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <Calendar size={12} className="me-1" />
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
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Submission Details */}
                <div className="col-lg-8">
                    {selectedSubmission ? (
                        <SubmissionDetails
                            submission={selectedSubmission}
                            onAnswerReview={handleAnswerReview}
                            onFinalReview={handleSubmissionFinalReview}
                            onCompleteReview={handleCompleteReview}
                            editingAnswer={editingAnswer}
                            setEditingAnswer={setEditingAnswer}
                            selectedRiskLevel={selectedRiskLevel}
                            setSelectedRiskLevel={setSelectedRiskLevel}
                            summaryText={summaryText}
                            setSummaryText={setSummaryText}
                            getRiskColor={getRiskColor}
                            getRiskIcon={getRiskIcon}
                            formatDate={formatDate}
                        />
                    ) : (
                        <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                                <TrendingUp size={64} className="text-muted mb-3" />
                                <h4 className="text-muted">Select a Submission</h4>
                                <p className="text-muted">Choose a submission from the list to view and assess its details.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

        // Answer Review Form Component
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
            const riskOptions = [
                { value: 'low', label: 'Low Risk', description: 'Minimal security impact' },
                { value: 'medium', label: 'Medium Risk', description: 'Moderate security concern' },
                { value: 'high', label: 'High Risk', description: 'Significant security risk' }
            ];

            return (
                <div className="border border-primary rounded p-3 bg-primary-subtle">
                    <h6 className="text-primary mb-3">
                        <Edit3 size={16} className="me-1" />
                        Risk Assessment
                    </h6>
                    
                    <div className="row">
                        <div className="col-md-6">
                            <label className="form-label fw-medium">Risk Level</label>
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
                                            onChange={(e) => setAdminRiskLevel(e.target.value)}
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
                                <label className="form-label fw-medium">Admin Notes</label>
                                <textarea
                                    className="form-control"
                                    rows={3}
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    placeholder="Internal notes about this assessment..."
                                />
                                <div className="form-text">These notes are for internal review purposes.</div>
                            </div>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-medium">Recommendation</label>
                        <textarea
                            className="form-control"
                            rows={3}
                            value={recommendation}
                            onChange={(e) => setRecommendation(e.target.value)}
                            placeholder="Recommendations for addressing this issue..."
                        />
                        <div className="form-text">Provide actionable recommendations for the user.</div>
                    </div>

                    <div className="d-flex justify-content-end gap-2">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onCancel}
                        >
                            <X size={16} className="me-1" />
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onSave();
                            }}
                            style={{ display: 'inline-block' }} // Ensure no form interference
                        >
                            <Save size={16} className="me-1" />
                            Save Assessment
                        </button>
                    </div>
                </div>
            );
        };

// Final Review Form Component
const FinalReviewForm = ({ 
    adminOverallRisk, 
    setAdminOverallRisk, 
    adminSummary, 
    setAdminSummary, 
    onSubmit, 
    onCancel 
}) => {
    const riskOptions = [
        { value: 'low', label: 'Low Risk', color: 'success' },
        { value: 'medium', label: 'Medium Risk', color: 'warning' },
        { value: 'high', label: 'High Risk', color: 'danger' }
    ];

    return (
        <div className="mt-3 p-3 border rounded bg-light">
            <h6 className="mb-3">Final Risk Assessment</h6>
            
            <div className="row">
                <div className="col-md-6">
                    <label className="form-label fw-medium">Overall Risk Level</label>
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
                                    onChange={(e) => setAdminOverallRisk(e.target.value)}
                                />
                                <label className="form-check-label" htmlFor={`overall-risk-${option.value}`}>
                                    <span className={`badge bg-${option.color} me-2`}>
                                        {option.label}
                                    </span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="col-md-6">
                    <label className="form-label fw-medium">Executive Summary</label>
                    <textarea
                        className="form-control"
                        rows={4}
                        value={adminSummary}
                        onChange={(e) => setAdminSummary(e.target.value)}
                        placeholder="Provide an overall assessment and key recommendations..."
                        required
                    />
                </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-success"
                    onClick={onSubmit}
                    disabled={!adminOverallRisk || !adminSummary.trim()}
                >
                    <CheckSquare size={16} className="me-1" />
                    Complete Review
                </button>
            </div>
        </div>
    );
};

export default ManageSubmissions;

// Submission Details Component
const SubmissionDetails = ({ 
    submission, 
    onAnswerReview, 
    onFinalReview,
    onCompleteReview, 
    editingAnswer, 
    setEditingAnswer, 
    getRiskColor, 
    getRiskIcon, 
    formatDate 
}) => {
    const [finalReviewMode, setFinalReviewMode] = useState(false);
    const [adminOverallRisk, setAdminOverallRisk] = useState(submission.admin_overall_risk || '');
    const [adminSummary, setAdminSummary] = useState(submission.admin_summary || '');

    const canFinalize = submission.status === 'under_review' && 
                       submission.answers?.every(answer => answer.reviewed_by);

    return (
        <div className="card border-0 shadow-sm">
            {/* Submission Header */}
            <div className="card-header bg-white">
                <div className="d-flex justify-content-between align-items-start">
                    <div>
                        <h4 className="mb-2">{submission.title}</h4>
                        <div className="d-flex align-items-center text-muted small">
                            <div className="me-4">
                                <User size={14} className="me-1" />
                                {submission.user?.name || submission.user?.email}
                            </div>
                            <div className="me-4">
                                <Calendar size={14} className="me-1" />
                                {formatDate(submission.created_at)}
                            </div>
                            {submission.reviewed_at && (
                                <div>
                                    <CheckSquare size={14} className="me-1" />
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
                {/* Final Review Section */}
                {(canFinalize || submission.status === 'completed') && (
                    <div className="alert alert-info mb-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div>
                                <h6 className="alert-heading mb-1">Final Review</h6>
                                <p className="mb-0">
                                    {submission.status === 'completed' 
                                        ? 'This submission has been completed.'
                                        : 'All answers have been reviewed. Ready for final assessment.'
                                    }
                                </p>
                            </div>
                            {submission.status !== 'completed' && (
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => setFinalReviewMode(!finalReviewMode)}
                                >
                                    {finalReviewMode ? 'Cancel' : 'Finalize Review'}
                                </button>
                            )}
                        </div>
                        
                        {finalReviewMode && (
                            <FinalReviewForm
                                adminOverallRisk={adminOverallRisk}
                                setAdminOverallRisk={setAdminOverallRisk}
                                adminSummary={adminSummary}
                                setAdminSummary={setAdminSummary}
                                onSubmit={() => {
                                    onFinalReview(submission.id, adminOverallRisk, adminSummary);
                                    setFinalReviewMode(false);
                                }}
                                onCancel={() => setFinalReviewMode(false)}
                            />
                        )}
                    </div>
                )}

                {/* Admin Summary Display */}
                        {submission.admin_summary && (
                            <div className="alert alert-success mb-4">
                                <h6 className="alert-heading">Admin Summary</h6>
                                <p className="mb-0">{submission.admin_summary}</p>
                                {submission.reviewer && (
                                    <small className="text-muted">
                                        Reviewed by {submission.reviewer.name || submission.reviewer.email}
                                    </small>
                                )}
                            </div>
                        )}

                        {/* Answers Section */}
                        <h5 className="mb-3">Audit Answers</h5>
                        <div className="accordion" id="answersAccordion">
                            {submission.answers?.map((answer, index) => (
                                <AnswerCard
                                    key={answer.id}
                                    answer={answer}
                                    index={index}
                                    isEditing={editingAnswer === answer.id}
                                    onEdit={(answerId) => setEditingAnswer(editingAnswer === answerId ? null : answerId)}
                                    onSave={onAnswerReview}
                                    onCancel={() => setEditingAnswer(null)}
                                    getRiskColor={getRiskColor}
                                    getRiskIcon={getRiskIcon}
                                    formatDate={formatDate}
                                    canEdit={submission.status !== 'completed'}
                                />
                            ))}
                        </div>

                        {!submission.answers?.length && (
                            <div className="text-center py-4">
                                <AlertCircle size={48} className="text-muted mb-3" />
                                <p className="text-muted">No answers found for this submission.</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        // Answer Card Component
        const AnswerCard = ({ answer, index, isEditing, onEdit, onSave, onCancel, getRiskColor, getRiskIcon, formatDate, canEdit }) => {
            const [adminRiskLevel, setAdminRiskLevel] = useState(answer.admin_risk_level || answer.system_risk_level || 'low');
            const [adminNotes, setAdminNotes] = useState(answer.admin_notes || '');
            const [recommendation, setRecommendation] = useState(answer.recommendation || '');

            const handleSave = () => {
                onSave(answer.id, adminRiskLevel, adminNotes, recommendation);
            };

            const effectiveRiskLevel = answer.admin_risk_level || answer.system_risk_level || 'pending';
            const isReviewed = answer.reviewed_by;

            return (
                <div className="accordion-item">
                    <h2 className="accordion-header">
                        <button
                            className="accordion-button collapsed"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target={`#answer${answer.id}`}
                            aria-expanded="false"
                        >
                            <div className="d-flex justify-content-between align-items-center w-100 me-3">
                                <div className="flex-grow-1">
                                    <div className="fw-medium">{answer.question?.question}</div>
                                    <div className="small text-muted">
                                        Category: {answer.question?.category}
                                        {isReviewed && (
                                            <span className="ms-2">
                                                <CheckCircle size={12} className="text-success me-1" />
                                                Reviewed
                                            </span>
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
                            {/* User's Answer */}
                            <div className="mb-3">
                                <h6>User's Response:</h6>
                                <div className="p-3 bg-light rounded">
                                    {answer.answer}
                                </div>
                            </div>

                            {/* System Risk Level Display */}
                            {answer.system_risk_level && (
                                <div className="mb-3">
                                    <h6>System Assessment:</h6>
                                    <span className={`badge ${getRiskColor(answer.system_risk_level)}`}>
                                        {getRiskIcon(answer.system_risk_level)}
                                        System Risk: {answer.system_risk_level.toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Review Section */}
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
                                                <strong>Admin Assessment:</strong>
                                                <span className={`badge ${getRiskColor(answer.admin_risk_level)} ms-2`}>
                                                    {getRiskIcon(answer.admin_risk_level)}
                                                    {answer.admin_risk_level.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        {answer.admin_notes && (
                                            <div className="mb-2">
                                                <strong>Admin Notes:</strong>
                                                <p className="mb-0 mt-1">{answer.admin_notes}</p>
                                            </div>
                                        )}
                                        {answer.recommendation && (
                                            <div className="mb-2">
                                                <strong>Recommendation:</strong>
                                                <p className="mb-0 mt-1">{answer.recommendation}</p>
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
                                                <small><Eye size={14} className="me-1" />This answer is pending admin review.</small>
                                            </div>
                                        )}
                                    </div>
                                    {canEdit && (
                                        <button
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => onEdit(answer.id)}
                                        >
                                            <Edit3 size={14} className="me-1" />
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