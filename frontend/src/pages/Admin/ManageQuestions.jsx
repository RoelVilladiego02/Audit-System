import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import QuestionForm from '../../components/QuestionForm';
import { useAuth } from '../../context/AuthContext';

const ManageQuestions = () => {
    const { user, isAdmin, loading: authLoading } = useAuth();
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);

const fetchQuestions = useCallback(async () => {
    try {
        setLoading(true);
        setError(null);
        
        // Verify token exists
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        console.log('Making API request with token:', token);
        console.log('User role:', user?.role);
        
        const response = await api.get('/audit-questions');
        console.log('API Response:', response);
        
        if (response.data) {
            setQuestions(response.data);
        } else {
            setQuestions([]);
            setError('No questions found.');
        }
    } catch (err) {
        console.error('Error fetching questions:', err);
        console.error('Error response:', err.response);
        
        setQuestions([]);
        
        // Handle different types of errors
        if (err.response?.status === 403) {
            setError('Access denied. You do not have permission to view audit questions. Please ensure you are logged in as an admin.');
        } else if (err.response?.status === 401) {
            setError('Authentication failed. Please log in again.');
            // Redirect to login
            localStorage.removeItem('token');
            window.location.href = '/login';
        } else {
            setError(
                err.response?.data?.message || 
                err.message || 
                'Failed to load questions. Please try again later.'
            );
        }
    } finally {
        setLoading(false);
    }
}, [user]); // Add user as dependency since we use user?.role inside

useEffect(() => {
    if (!authLoading && user && isAdmin) {
        fetchQuestions();
    } else if (!authLoading && user && !isAdmin) {
        setError('You do not have permission to access this page.');
        setLoading(false);
    }
}, [user, isAdmin, authLoading, fetchQuestions]);

    const handleDelete = async (questionId) => {
        try {
            await api.delete(`/audit-questions/${questionId}`);
            setQuestions(questions.filter(q => q.id !== questionId));
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

    // Show loading while checking authentication
    if (authLoading) {
        return (
            <div className="container-fluid d-flex align-items-center justify-content-center vh-100 bg-light">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted">Loading Questions Management...</h5>
                    <p className="text-muted small">Please wait while we fetch your data</p>
                </div>
            </div>
        );
    }

    // Redirect if not authenticated or not admin
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

    return (
        <div className="container py-4">
            <div className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h1 className="display-5">Manage Audit Questions</h1>
                    <p className="text-muted">
                        Add, edit, or remove security audit questions.
                    </p>
                    <small className="text-info">
                        User: {user?.email} | Role: {user?.role}
                    </small>
                </div>
                <button
                    onClick={() => setCreateModalOpen(true)}
                    className="btn btn-primary"
                >
                    Add New Question
                </button>
            </div>

            {error && (
                <div className="alert alert-danger mb-4">
                    <strong>Error:</strong> {error}
                    {error.includes('Access denied') && (
                        <div className="mt-2">
                            <button 
                                onClick={fetchQuestions} 
                                className="btn btn-sm btn-outline-primary me-2"
                                disabled={loading}
                            >
                                Retry
                            </button>
                            <a href="/login" className="btn btn-sm btn-outline-secondary">
                                Re-login
                            </a>
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="container-fluid d-flex align-items-center justify-content-center vh-100 bg-light">
                    <div className="text-center">
                        <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                        <h5 className="text-muted">Loading Questions...</h5>
                        <p className="text-muted small">Please wait while we fetch the questions</p>
                    </div>
                </div>
            ) : questions.length === 0 && !error ? (
                <div className="card">
                    <div className="card-body text-center py-5">
                        <h5 className="card-title">No Questions Found</h5>
                        <p className="card-text text-muted">
                            There are no audit questions available. Create your first question to get started.
                        </p>
                        <button
                            onClick={() => setCreateModalOpen(true)}
                            className="btn btn-primary"
                        >
                            Create First Question
                        </button>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <ul className="list-group list-group-flush">
                        {questions.map((question) => (
                            <li key={question.id} className="list-group-item">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div className="me-auto" style={{ maxWidth: '80%' }}>
                                        <h5 className="mb-1">
                                            {question.question}
                                        </h5>
                                        {question.description && (
                                            <p className="text-muted mb-2">
                                                {question.description}
                                            </p>
                                        )}
                                        <div className="mb-2">
                                            <small className="text-secondary fw-bold d-block mb-1">Category:</small>
                                            <span className="badge bg-info text-white">
                                                {question.category}
                                            </span>
                                        </div>
                                        <div className="mb-2">
                                            <small className="text-primary fw-bold d-block mb-1">Possible Answers:</small>
                                            <div className="d-flex gap-2 flex-wrap">
                                                {question.possible_answers?.map((answer, index) => (
                                                    <span key={index} className="badge bg-light text-dark border">
                                                        {answer}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="risk-criteria small">
                                            <small className="fw-bold d-block mb-1">Risk Criteria:</small>
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
                                        <small className="text-info d-block mt-2">ID: {question.id}</small>
                                    </div>
                                    <div className="btn-group align-self-start">
                                        <button
                                            onClick={() => {
                                                setSelectedQuestion(question);
                                                setEditModalOpen(true);
                                            }}
                                            className="btn btn-outline-primary btn-sm"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => openDeleteModal(question)}
                                            className="btn btn-outline-danger btn-sm"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModalOpen && questionToDelete && (
                <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Delete Question</h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => {
                                        setDeleteModalOpen(false);
                                        setQuestionToDelete(null);
                                    }}
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
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setDeleteModalOpen(false);
                                        setQuestionToDelete(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(questionToDelete.id)}
                                    className="btn btn-danger"
                                >
                                    Delete
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
                    onClose={() => setCreateModalOpen(false)}
                    onSuccess={() => {
                        fetchQuestions();
                    }}
                />
            )}

            {/* Edit Question Modal */}
            {editModalOpen && selectedQuestion && (
                <QuestionForm
                    isEdit
                    title="Edit Question"
                    questionData={selectedQuestion}
                    onClose={() => {
                        setEditModalOpen(false);
                        setSelectedQuestion(null);
                    }}
                    onSuccess={() => {
                        fetchQuestions();
                    }}
                />
            )}
        </div>
    );
};

export default ManageQuestions;