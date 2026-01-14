import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import axios from '../../api/axios';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning text-dark';
      case 'under_review':
        return 'bg-info text-dark';
      case 'completed':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  const getRiskBadgeClass = (risk) => {
    switch (risk) {
      case 'high':
        return 'bg-danger';
      case 'medium':
        return 'bg-warning text-dark';
      case 'low':
        return 'bg-success';
      default:
        return 'bg-secondary';
    }
  };

  const handleDeleteSubmission = async (submissionId, submissionTitle) => {
    try {
      setDeleting(true);
      await axios.delete(`/audit-submissions/${submissionId}`);
      
      // Remove from stats
      setStats(prev => ({
        ...prev,
        recent_submissions: prev.recent_submissions.filter(s => s.id !== submissionId)
      }));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete submission');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-dark fw-bold mb-2">Loading Dashboard...</h5>
          <p className="text-muted small">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <div className="container-fluid py-4">
        <header className="bg-white shadow-sm py-3 mb-4">
          <div className="container-fluid d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 fw-bold mb-1">Welcome, {user?.name}</h1>
              <p className="text-muted mb-0 small">
                Admin Dashboard | User: {user?.email} | Role: {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </p>
            </div>
            <Link to="/admin/questions/create" className="btn btn-primary" aria-label="Create New Question">
              <i className="bi bi-plus-circle me-2"></i>Create New Question
            </Link>
          </div>
        </header>

        {error && (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-circle-fill me-2"></i>
            {error}
            <button type="button" className="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-shrink-0 bg-primary bg-opacity-10 rounded-circle p-3 me-3">
                    <i className="bi bi-file-text text-primary" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h6 className="text-muted fw-semibold mb-1">Pending Reviews</h6>
                    <h3 className="fw-bold mb-0">{stats.pending_reviews}</h3>
                  </div>
                </div>
                <div className="mt-3">
                  <Link
                    to="/admin/submissions?status=pending"
                    className="text-primary small text-decoration-none"
                    aria-label="View pending submissions"
                  >
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
                  <div className="flex-shrink-0 bg-success bg-opacity-10 rounded-circle p-3 me-3">
                    <i className="bi bi-check-circle text-success" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h6 className="text-muted fw-semibold mb-1">Under Review</h6>
                    <h3 className="fw-bold mb-0">{stats.under_review}</h3>
                  </div>
                </div>
                <div className="mt-3">
                  <Link
                    to="/admin/submissions?status=under_review"
                    className="text-primary small text-decoration-none"
                    aria-label="View submissions under review"
                  >
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
                  <div className="flex-shrink-0 bg-danger bg-opacity-10 rounded-circle p-3 me-3">
                    <i className="bi bi-exclamation-triangle text-danger" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                  <div>
                    <h6 className="text-muted fw-semibold mb-1">High Risk Submissions</h6>
                    <h3 className="fw-bold mb-0">{stats.high_risk_submissions}</h3>
                  </div>
                </div>
                <div className="mt-3">
                  <Link to="/analytics" className="text-primary small text-decoration-none" aria-label="View risk analysis">
                    View risk analysis
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title fw-bold">Manage Questions</h5>
                <p className="card-text text-muted">Create, edit, and manage audit questions and their categories.</p>
                <Link to="/admin/questions" className="btn btn-outline-primary" aria-label="Manage Questions">
                  <i className="bi bi-question-circle me-2"></i>Manage Questions
                </Link>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title fw-bold">Analytics Dashboard</h5>
                <p className="card-text text-muted">View detailed analytics and reports for all submissions.</p>
                <Link to="/analytics" className="btn btn-outline-primary" aria-label="View Analytics">
                  <i className="bi bi-bar-chart me-2"></i>View Analytics
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
            {stats.recent_submissions.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-file-text text-muted display-4 mb-3"></i>
                <h5 className="text-muted fw-bold">No Recent Submissions</h5>
                <p className="text-muted">There are no recent submissions to display.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4">Submission</th>
                      <th className="border-0">User</th>
                      <th className="border-0">Company</th>
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
                          <span
                            className="text-truncate d-block"
                            style={{ maxWidth: '200px' }}
                            title={submission.title}
                          >
                            {submission.title}
                          </span>
                        </td>
                        <td className="text-muted">{submission.user?.name || 'Unknown'}</td>
                        <td className="text-muted">
                          {submission.user?.company ? (
                            <span title={submission.user.company} className="text-truncate d-block" style={{ maxWidth: '150px' }}>
                              <i className="bi bi-building me-1"></i>
                              {submission.user.company}
                            </span>
                          ) : (
                            <span className="text-muted fst-italic">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(submission.status)}`}>
                            {submission.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getRiskBadgeClass(submission.effective_overall_risk)}`}>
                            {submission.effective_overall_risk.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="progress" style={{ height: '6px', width: '100px' }}>
                            <div
                              className="progress-bar bg-info"
                              role="progressbar"
                              style={{ width: `${submission.review_progress}%` }}
                              aria-valuenow={submission.review_progress}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            ></div>
                          </div>
                        </td>
                        <td className="text-muted">
                          {new Date(submission.created_at).toLocaleDateString()}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-danger p-0"
                            onClick={() => setDeleteConfirm(submission)}
                            aria-label={`Delete submission ${submission.title}`}
                            title="Delete this submission"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Question Statistics */}
        <div className="card border-0 shadow-sm mt-4">
          <div className="card-header bg-white py-3">
            <h5 className="mb-0 fw-bold">Question Statistics</h5>
            <p className="text-muted small mb-0">Overview of audit question performance and risk distribution</p>
          </div>
          <div className="card-body p-0">
            {questionStats.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-question-circle text-muted display-4 mb-3"></i>
                <h5 className="text-muted fw-bold">No Question Statistics</h5>
                <p className="text-muted">There are no question statistics to display.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
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
                          <span
                            className="text-truncate d-block"
                            style={{ maxWidth: '200px' }}
                            title={question.question}
                          >
                            {question.question}
                          </span>
                        </td>
                        <td className="text-muted">{question.category}</td>
                        <td>{question.answers_count}</td>
                        <td>
                          <span className={`badge ${question.high_risk_count > 0 ? 'bg-danger' : 'bg-success'}`}>
                            {question.high_risk_count}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-warning text-dark">{question.pending_review_count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="modal d-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header border-danger bg-light">
                  <h5 className="modal-title text-danger fw-bold">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Delete Submission
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="mb-3">
                    Are you sure you want to delete <strong>"{deleteConfirm.title}"</strong>?
                  </p>
                  <p className="text-muted small mb-0">
                    <i className="bi bi-info-circle me-1"></i>
                    This action cannot be undone.
                  </p>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setDeleteConfirm(null)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-danger" 
                    onClick={() => handleDeleteSubmission(deleteConfirm.id, deleteConfirm.title)}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-trash me-2"></i>
                        Delete Submission
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
