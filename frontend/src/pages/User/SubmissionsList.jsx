import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const getRiskLevelBadge = (level) => {
    const badges = {
        high: 'badge bg-danger',
        medium: 'badge bg-warning text-dark',
        low: 'badge bg-success'
    };
    return badges[level.toLowerCase()] || 'badge bg-secondary';
};

const getRiskIcon = (level) => {
    const icons = {
        high: '🔴',
        medium: '🟡', 
        low: '🟢'
    };
    return icons[level.toLowerCase()] || '⚪';
};

const SubmissionsList = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            // Get user info to determine which endpoint to use
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            
            let endpoint;
            if (user.role === 'admin') {
                // Admin can see all audit submissions
                endpoint = '/api/admin/audit-submissions';
            } else {
                // Regular users see only their own submissions
                endpoint = '/api/my-audit-submissions';
            }
            
            const response = await api.get(endpoint);
            setSubmissions(response.data);
        } catch (err) {
            console.error('Error fetching submissions:', err);
            setError('Failed to load submissions. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container-fluid py-4">
                <div className="d-flex justify-content-center align-items-center" style={{minHeight: '50vh'}}>
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-3" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="text-muted">Loading your audit submissions...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container-fluid py-4">
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            {/* Header Section */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h2 className="fw-bold text-dark mb-1">Audit Submissions</h2>
                            <p className="text-muted mb-0">View and analyze your previous security audit submissions</p>
                        </div>
                        <Link to="/audit" className="btn btn-primary">
                            <i className="bi bi-plus-circle me-2"></i>
                            New Audit
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {submissions.length > 0 && (
                <div className="row mb-4">
                    <div className="col-md-3 col-sm-6 mb-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body text-center">
                                <div className="display-6 text-primary mb-2">{submissions.length}</div>
                                <h6 className="card-title text-muted mb-0">Total Submissions</h6>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 col-sm-6 mb-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body text-center">
                                <div className="display-6 text-danger mb-2">
                                    {submissions.filter(s => s.overall_risk === 'high').length}
                                </div>
                                <h6 className="card-title text-muted mb-0">High Risk</h6>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 col-sm-6 mb-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body text-center">
                                <div className="display-6 text-warning mb-2">
                                    {submissions.filter(s => s.overall_risk === 'medium').length}
                                </div>
                                <h6 className="card-title text-muted mb-0">Medium Risk</h6>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3 col-sm-6 mb-3">
                        <div className="card border-0 shadow-sm h-100">
                            <div className="card-body text-center">
                                <div className="display-6 text-success mb-2">
                                    {submissions.filter(s => s.overall_risk === 'low').length}
                                </div>
                                <h6 className="card-title text-muted mb-0">Low Risk</h6>
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
                                    <i className="bi bi-clipboard-data display-1 text-muted"></i>
                                </div>
                                <h4 className="text-muted mb-3">No Submissions Found</h4>
                                <p className="text-muted mb-4">You haven't submitted any security audits yet.</p>
                                <Link to="/audit" className="btn btn-primary btn-lg">
                                    <i className="bi bi-plus-circle me-2"></i>
                                    Start Your First Audit
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="row">
                    <div className="col-12">
                        <div className="card border-0 shadow-sm">
                            <div className="card-header bg-white border-bottom">
                                <h5 className="card-title mb-0">
                                    <i className="bi bi-list-ul me-2"></i>
                                    Recent Submissions
                                </h5>
                            </div>
                            <div className="list-group list-group-flush">
                                {submissions.map((submission, index) => (
                                    <Link 
                                        key={submission.id}
                                        to={`/submissions/${submission.id}`}
                                        className="list-group-item list-group-item-action border-0"
                                        style={{textDecoration: 'none'}}
                                    >
                                        <div className="d-flex w-100 justify-content-between align-items-start">
                                            <div className="flex-grow-1">
                                                <div className="d-flex align-items-center mb-2">
                                                    <span className="me-2 fs-5">
                                                        {getRiskIcon(submission.overall_risk || 'low')}
                                                    </span>
                                                    <h6 className="mb-0 fw-bold text-primary">
                                                        {submission.title || `Audit Results #${submission.id}`}
                                                    </h6>
                                                    <span className={`ms-2 ${getRiskLevelBadge(submission.overall_risk || 'low')}`}>
                                                        {(submission.overall_risk || 'low').toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="row text-muted small">
                                                    <div className="col-md-6">
                                                        <i className="bi bi-calendar3 me-1"></i>
                                                        Submitted on {new Date(submission.created_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </div>
                                                    <div className="col-md-6">
                                                        <i className="bi bi-person me-1"></i>
                                                        Submitted by: {submission.user?.name || 'Unknown'}
                                                    </div>
                                                </div>
                                                {submission.summary && (
                                                    <p className="mt-2 mb-0 text-muted small">
                                                        {submission.summary.length > 120 
                                                            ? `${submission.summary.substring(0, 120)}...` 
                                                            : submission.summary
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                            <div className="ms-3 d-flex align-items-center">
                                                <i className="bi bi-chevron-right text-muted"></i>
                                            </div>
                                        </div>
                                        
                                        {/* Progress indicator for recent submissions */}
                                        {index < 3 && (
                                            <div className="mt-2">
                                                <small className="text-success">
                                                    <i className="bi bi-clock me-1"></i>
                                                    Recent
                                                </small>
                                            </div>
                                        )}
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
                        <div className="card border-0 bg-light">
                            <div className="card-body py-3">
                                <div className="row text-center">
                                    <div className="col-md-4">
                                        <small className="text-muted">
                                            <i className="bi bi-info-circle me-1"></i>
                                            Click on any submission to view detailed analysis
                                        </small>
                                    </div>
                                    <div className="col-md-4">
                                        <small className="text-muted">
                                            <i className="bi bi-shield-check me-1"></i>
                                            Keep your security assessments up to date
                                        </small>
                                    </div>
                                    <div className="col-md-4">
                                        <small className="text-muted">
                                            <i className="bi bi-graph-up me-1"></i>
                                            Track your security improvements over time
                                        </small>
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