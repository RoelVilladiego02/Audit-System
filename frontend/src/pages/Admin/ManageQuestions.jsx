import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const ManageQuestions = () => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const response = await api.get('/api/questions');
            if (response.data) {
                setQuestions(response.data);
            } else {
                setQuestions([]);
                setError('No questions found.');
            }
        } catch (err) {
            console.error('Error fetching questions:', err);
            setQuestions([]);
            setError(
                err.response?.data?.message || 
                err.message || 
                'Failed to load questions. Please try again later.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (questionId) => {
        try {
            await api.delete(`/api/questions/${questionId}`);
            setQuestions(questions.filter(q => q.id !== questionId));
            setDeleteModalOpen(false);
            setQuestionToDelete(null);
        } catch (err) {
            setError('Failed to delete question. Please try again.');
        }
    };

    const openDeleteModal = (question) => {
        setQuestionToDelete(question);
        setDeleteModalOpen(true);
    };

    if (loading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
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
                </div>
                <Link
                    to="/admin/questions/create"
                    className="btn btn-primary"
                >
                    Add New Question
                </Link>
            </div>

            {error && (
                <div className="alert alert-danger mb-4">
                    {error}
                </div>
            )}

            <div className="card">
                <ul className="list-group list-group-flush">
                    {questions.map((question) => (
                        <li key={question.id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start">
                                <div className="me-auto">
                                    <h5 className="mb-1">
                                        {question.text}
                                    </h5>
                                    {question.hint && (
                                        <p className="text-muted mb-0">
                                            {question.hint}
                                        </p>
                                    )}
                                </div>
                                <div className="btn-group">
                                    <Link
                                        to={`/admin/questions/${question.id}/edit`}
                                        className="btn btn-outline-primary btn-sm"
                                    >
                                        Edit
                                    </Link>
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
                                <p>Are you sure you want to delete this question? This action cannot be undone.</p>
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
        </div>
    );
};

export default ManageQuestions;
