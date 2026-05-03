import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import QuestionForm from '../../components/QuestionForm';
import { useAuth } from '../../context/AuthContext';

const ManageQuestions = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [questionnaireSets, setQuestionnaireSets] = useState([]);
  const [activeSetId, setActiveSetId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedSetForCreate, setSelectedSetForCreate] = useState(null);

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.get('/audit-questions');
      if (response.data) {
        setQuestions(response.data);
      } else {
        setQuestions([]);
        setError('No questions found.');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setQuestions([]);
      if (err.response?.status === 403) {
        setError('Access denied. You do not have permission to view audit questions. Please ensure you are logged in as an admin.');
      } else if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        // Don't auto-redirect, let the user handle it
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load questions. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuestionnaireSets = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await api.get('/questionnaire-sets');
      if (response.data && response.data.length > 0) {
        setQuestionnaireSets(response.data);
        // Set the first active set as default
        setActiveSetId(response.data[0].id);
      } else {
        setQuestionnaireSets([]);
        setActiveSetId(null);
      }
    } catch (err) {
      console.error('Error fetching questionnaire sets:', err);
      setQuestionnaireSets([]);
      setActiveSetId(null);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      fetchQuestions();
      fetchQuestionnaireSets();
    } else if (!authLoading && user && !isAdmin) {
      setError('You do not have permission to access this page.');
      setLoading(false);
    }
  }, [user, isAdmin, authLoading, fetchQuestions, fetchQuestionnaireSets]);

  const handleDelete = async (questionId) => {
    try {
      await api.delete(`/audit-questions/${questionId}`);
      setQuestions(questions.filter((q) => q.id !== questionId));
      setDeleteModalOpen(false);
      setQuestionToDelete(null);
    } catch (err) {
      console.error('Delete error:', err);
      if (err.response?.status === 403) {
        setError('Access denied. You do not have permission to delete questions.');
      } else {
        setError(err.response?.data?.message || 'Failed to delete question. Please try again.');
      }
    }
  };

  const openDeleteModal = (question) => {
    setQuestionToDelete(question);
    setDeleteModalOpen(true);
  };

  // Filter questions by active set
  const filteredQuestions = activeSetId
    ? questions.filter((q) => q.questionnaire_set_id === activeSetId)
    : [];

  const activeSet = questionnaireSets.find((set) => set.id === activeSetId);

  if (authLoading || loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-dark fw-bold">Loading Questions Management</h5>
          <p className="text-muted">Fetching your audit questions...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm border-0 rounded-3 p-4" style={{ maxWidth: '500px' }}>
          <div className="card-body text-center">
            <i className="bi bi-exclamation-circle-fill text-danger display-4 mb-3"></i>
            <h5 className="card-title text-danger fw-bold mb-3">Access Denied</h5>
            <p className="text-muted mb-4">You must be logged in as an admin to access this page.</p>
            <a href="/login" className="btn btn-primary">
              <i className="bi bi-box-arrow-in-right me-2"></i>Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm border-0 rounded-3 p-4" style={{ maxWidth: '500px' }}>
          <div className="card-body text-center">
            <i className="bi bi-exclamation-circle-fill text-danger display-4 mb-3"></i>
            <h5 className="card-title text-danger fw-bold mb-3">Error Loading Data</h5>
            <p className="text-muted mb-4">{error}</p>
            <div className="d-flex justify-content-center gap-2">
              <button
                className="btn btn-primary"
                onClick={fetchQuestions}
                disabled={loading}
                aria-label="Retry loading questions"
              >
                <i className="bi bi-arrow-repeat me-2"></i>Retry
              </button>
              {error.includes('Access denied') && (
                <a href="/login" className="btn btn-outline-secondary" aria-label="Go to login">
                  <i className="bi bi-box-arrow-in-right me-2"></i>Re-login
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <header className="bg-white shadow-sm py-3 mb-4">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="h3 fw-bold mb-1">Manage Audit Questions</h1>
              <p className="text-muted mb-0">Manage questions within the selected questionnaire set</p>
              <small className="text-info">
                User: {user?.email} | Role: {user?.role}
              </small>
            </div>
            <div className="col-md-6 text-end">
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedSetForCreate(activeSetId);
                  setCreateModalOpen(true);
                }}
                disabled={!activeSetId}
                aria-label="Add new audit question to active set"
              >
                <i className="bi bi-plus-circle me-2"></i>Add Question to Set
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Set Selection Navigation */}
      {questionnaireSets.length > 0 && (
        <div className="container-fluid mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex align-items-center gap-3">
                <label htmlFor="setSelector" className="fw-semibold text-muted mb-0">
                  <i className="bi bi-folder me-2"></i>Select Questionnaire Set:
                </label>
                <select
                  id="setSelector"
                  className="form-select form-select-sm"
                  style={{ maxWidth: '350px' }}
                  value={activeSetId || ''}
                  onChange={(e) => setActiveSetId(Number(e.target.value) || null)}
                >
                  <option value="">-- Choose a set --</option>
                  {questionnaireSets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.name} ({set.status || 'active'}) • {set.questions_count || 0} questions
                    </option>
                  ))}
                </select>
              </div>
              {activeSet && (
                <div className="mt-2 p-2 bg-light rounded">
                  <small className="text-muted">
                    <strong>{activeSet.name}</strong>
                    {activeSet.description && ` — ${activeSet.description}`}
                  </small>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container-fluid">
        {!activeSetId ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-inbox text-muted display-4 mb-3"></i>
              <h5 className="card-title fw-bold">No Set Selected</h5>
              <p className="text-muted mb-4">Select a questionnaire set from above to view and manage its questions.</p>
            </div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <i className="bi bi-question-circle-fill text-muted display-4 mb-3"></i>
              <h5 className="card-title fw-bold">No Questions in This Set</h5>
              <p className="text-muted mb-4">The selected questionnaire set has no questions yet. Click "Add Question to Set" to create your first question.</p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedSetForCreate(activeSetId);
                  setCreateModalOpen(true);
                }}
                aria-label="Create first question in this set"
              >
                <i className="bi bi-plus-circle me-2"></i>Add First Question
              </button>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h6 className="fw-bold mb-0">
                <i className="bi bi-list-ul text-primary me-2"></i>Questions in {activeSet?.name}
                <span className="badge bg-info ms-2">{filteredQuestions.length}</span>
              </h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th scope="col">Question</th>
                      <th scope="col">Category</th>
                      <th scope="col">Possible Answers</th>
                      <th scope="col">Risk Criteria</th>
                      <th scope="col">Default Recommendation</th>
                      <th scope="col" className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((question) => (
                      <tr key={question.id}>
                        <td>
                          <div>
                            <strong>{question.question}</strong>
                            {question.description && (
                              <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
                                {question.description}
                              </p>
                            )}
                            <small className="text-info">ID: {question.id}</small>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-info text-white">{question.category}</span>
                        </td>
                        <td>
                          <div className="d-flex gap-2 flex-wrap">
                            {question.possible_answers?.map((answer, index) => (
                              <span key={index} className="badge bg-light text-dark border">
                                {answer}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="risk-criteria small">
                            {question.risk_criteria?.high && (
                              <div className="text-danger mb-1">
                                <small className="fw-bold">High:</small> {question.risk_criteria.high}
                              </div>
                            )}
                            {question.risk_criteria?.medium && (
                              <div className="text-warning mb-1">
                                <small className="fw-bold">Medium:</small> {question.risk_criteria.medium}
                              </div>
                            )}
                            {question.risk_criteria?.low && (
                              <div className="text-success mb-1">
                                <small className="fw-bold">Low:</small> {question.risk_criteria.low}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="small text-muted">
                            {question.possible_recommendation ? (
                              <span>{question.possible_recommendation}</span>
                            ) : (
                              <span className="fst-italic text-secondary">No default recommendation</span>
                            )}
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="btn-group">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => {
                                setSelectedQuestion(question);
                                setEditModalOpen(true);
                              }}
                              aria-label={`Edit question ${question.id}`}
                            >
                              <i className="bi bi-pencil-fill"></i>
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => openDeleteModal(question)}
                              aria-label={`Delete question ${question.id}`}
                            >
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && questionToDelete && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow-sm">
                <div className="modal-header bg-white">
                  <h5 className="modal-title fw-bold">Delete Question</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setQuestionToDelete(null);
                    }}
                    aria-label="Close delete modal"
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this question?</p>
                  <p><strong>Question:</strong> {questionToDelete.question}</p>
                  <div className="mb-2">
                    <strong>Possible Answers:</strong>
                    <div className="d-flex gap-2 flex-wrap mt-1">
                      {questionToDelete.possible_answers?.map((answer, index) => (
                        <span key={index} className="badge bg-light text-dark border">
                          {answer}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-warning">This action cannot be undone.</p>
                </div>
                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setQuestionToDelete(null);
                    }}
                    aria-label="Cancel delete"
                  >
                    <i className="bi bi-x-circle me-2"></i>Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDelete(questionToDelete.id)}
                    aria-label="Confirm delete"
                  >
                    <i className="bi bi-trash-fill me-2"></i>Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Question Modal */}
        {createModalOpen && (
          <QuestionForm
            title="Create New Question"
            questionnaireSetId={selectedSetForCreate}
            onClose={() => {
              setCreateModalOpen(false);
              setSelectedSetForCreate(null);
            }}
            onSuccess={() => {
              fetchQuestions();
              setCreateModalOpen(false);
              setSelectedSetForCreate(null);
            }}
          />
        )}

        {/* Edit Question Modal */}
        {editModalOpen && selectedQuestion && (
          <QuestionForm
            isEdit
            title="Edit Question"
            questionData={selectedQuestion}
            questionnaireSetId={selectedQuestion.questionnaire_set_id}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedQuestion(null);
            }}
            onSuccess={() => {
              fetchQuestions();
              setEditModalOpen(false);
              setSelectedQuestion(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ManageQuestions;