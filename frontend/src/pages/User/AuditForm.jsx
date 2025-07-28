import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../auth/useAuth';

const AuditForm = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) return;

        // Redirect to login if not authenticated
        if (!user) {
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in to access the audit form.'
                }
            });
            return;
        }

        // Allow both user and admin roles
        if (!user.role || !['user', 'admin'].includes(user.role)) {
            setError('You do not have permission to access this form. Required role: user or admin');
            return;
        }
        
        fetchQuestions();
    }, [user, authLoading, navigate]);

    const fetchQuestions = async () => {
        try {
            console.log('Fetching questions with user:', user);
            const response = await api.get('/api/audit-questions');
            setQuestions(response.data);
            // Initialize answers object with empty values
            const initialAnswers = {};
            response.data.forEach(q => {
                initialAnswers[q.id] = '';
            });
            setAnswers(initialAnswers);
        } catch (err) {
            console.error('Error fetching questions:', err);
            
            if (err.response?.status === 401) {
                navigate('/login', { 
                    state: { 
                        from: '/audit-form',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
            } else if (err.response?.status === 403) {
                setError('You do not have permission to access audit questions.');
            } else {
                setError(err.response?.data?.message || 'Failed to load audit questions. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            // Format the data properly for the backend
            // Filter out empty answers and format correctly
            const validAnswers = Object.entries(answers)
                .filter(([questionId, answer]) => answer && answer.trim() !== '')
                .map(([questionId, answer]) => ({
                    audit_question_id: parseInt(questionId),
                    answer: answer.trim()
                }));

            if (validAnswers.length === 0) {
                setError('Please answer at least one question before submitting.');
                return;
            }

            const submissionData = {
                title: `Security Audit - ${new Date().toLocaleDateString()}`,
                answers: validAnswers
            };

            console.log('Submitting audit data:', submissionData);
            console.log('Number of questions:', questions.length);
            console.log('Number of valid answers:', validAnswers.length);
            console.log('Current answers state:', answers);
            
            const response = await api.post('/api/audit-submissions', submissionData);
            console.log('Submission successful:', response.data);
            
            setSuccess(true);
            // Reset form
            const resetAnswers = {};
            questions.forEach(q => {
                resetAnswers[q.id] = '';
            });
            setAnswers(resetAnswers);
        } catch (err) {
            console.error('Error submitting audit:', err);
            
            if (err.response?.status === 401) {
                navigate('/login');
            } else if (err.response?.status === 422) {
                // Validation errors
                const errors = err.response?.data?.errors;
                if (errors) {
                    const errorMessages = [];
                    Object.entries(errors).forEach(([field, messages]) => {
                        if (Array.isArray(messages)) {
                            errorMessages.push(...messages);
                        } else {
                            errorMessages.push(messages);
                        }
                    });
                    setError(`Validation errors: ${errorMessages.join(', ')}`);
                } else {
                    setError(err.response?.data?.message || 'Validation failed. Please check your inputs.');
                }
                console.error('Validation errors:', err.response?.data);
            } else {
                setError(err.response?.data?.message || 'Failed to submit audit. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const isFormValid = () => {
        // Check if all questions have been answered
        const totalQuestions = questions.length;
        const answeredQuestions = Object.values(answers).filter(answer => answer && answer.trim() !== '').length;
        return totalQuestions > 0 && answeredQuestions === totalQuestions;
    };

    if (authLoading || loading) {
        return (
            <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    <div className="card shadow">
                        <div className="card-body">
                            <div className="mb-4">
                                <h1 className="card-title h3 mb-2">Security Audit Assessment</h1>
                                <p className="text-muted">
                                    Complete all questions below to receive your security risk assessment.
                                </p>
                            </div>

                            {error && (
                                <div className="alert alert-danger mb-4" role="alert">
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                                        {error}
                                    </div>
                                </div>
                            )}

                            {success && (
                                <div className="alert alert-success mb-4" role="alert">
                                    <div className="d-flex align-items-center">
                                        <i className="bi bi-check-circle-fill me-2"></i>
                                        Audit submitted successfully! You can view your results in the submissions page.
                                    </div>
                                </div>
                            )}

                            {questions.length === 0 && !error ? (
                                <div className="alert alert-info">
                                    <i className="bi bi-info-circle me-2"></i>
                                    No audit questions are currently available.
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    {questions.map((question, index) => (
                                        <div key={question.id} className="card mb-4">
                                            <div className="card-body">
                                                <div className="d-flex align-items-start mb-2">
                                                    <span className="badge bg-primary me-2">{index + 1}</span>
                                                    <label className="form-label fw-semibold mb-0">
                                                        {question.question}
                                                        <span className="text-danger ms-1">*</span>
                                                    </label>
                                                </div>
                                                {question.description && (
                                                    <p className="text-muted small mb-3 ms-4">{question.description}</p>
                                                )}
                                                <div className="ms-4">
                                                    <select
                                                        value={answers[question.id] || ''}
                                                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                        className={`form-select ${!answers[question.id] ? 'is-invalid' : 'is-valid'}`}
                                                        required
                                                    >
                                                        <option value="">Select an answer</option>
                                                        {question.possible_answers?.map((answer, answerIndex) => (
                                                            <option key={answerIndex} value={answer}>
                                                                {answer}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {!answers[question.id] && (
                                                        <div className="invalid-feedback">
                                                            Please select an answer for this question.
                                                        </div>
                                                    )}
                                                </div>
                                                {question.risk_criteria && (
                                                    <div className="mt-3 ms-4">
                                                        <h6 className="text-muted small mb-2">Risk Assessment Criteria:</h6>
                                                        {question.risk_criteria.high && (
                                                            <p className="text-danger small mb-1">
                                                                <strong>🔴 High Risk:</strong> {question.risk_criteria.high}
                                                            </p>
                                                        )}
                                                        {question.risk_criteria.medium && (
                                                            <p className="text-warning small mb-1">
                                                                <strong>🟡 Medium Risk:</strong> {question.risk_criteria.medium}
                                                            </p>
                                                        )}
                                                        {question.risk_criteria.low && (
                                                            <p className="text-success small mb-1">
                                                                <strong>🟢 Low Risk:</strong> {question.risk_criteria.low}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {questions.length > 0 && (
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="text-muted small">
                                                <i className="bi bi-info-circle me-1"></i>
                                                Please answer all questions before submitting
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={submitting || !isFormValid()}
                                                className="btn btn-primary btn-lg"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-check-circle me-2"></i>
                                                        Submit Audit
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditForm;