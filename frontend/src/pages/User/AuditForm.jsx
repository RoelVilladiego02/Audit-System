import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../auth/useAuth';

const AuditForm = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [customAnswers, setCustomAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchQuestions = React.useCallback(async () => {
        try {
            const response = await api.get('audit-questions');
            setQuestions(response.data);
            const initialAnswers = {};
            const initialCustomAnswers = {};
            response.data.forEach(q => {
                initialAnswers[q.id] = '';
                initialCustomAnswers[q.id] = '';
            });
            setAnswers(initialAnswers);
            setCustomAnswers(initialCustomAnswers);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login', { 
                    state: { 
                        from: '/audit-form',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
            } else {
                setError(err.response?.data?.message || 'Failed to load questions. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in to access the form.'
                }
            });
            return;
        }
        if (!user.role || user.role !== 'user') {
            setError('You do not have permission to submit audits.');
            return;
        }
        fetchQuestions();
    }, [user, authLoading, navigate, fetchQuestions]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
        if (value !== 'Others') {
            setCustomAnswers(prev => ({
                ...prev,
                [questionId]: ''
            }));
        }
    };

    const handleCustomAnswerChange = (questionId, value) => {
        setCustomAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const getFinalAnswer = (questionId) => {
        const answer = answers[questionId];
        if (answer === 'Others' && customAnswers[questionId]?.trim()) {
            return customAnswers[questionId].trim();
        }
        return answer;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Your session has expired. Please log in again.');
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in to submit the form.'
                }
            });
            return;
        }

        try {
            const validAnswers = Object.entries(answers)
                .filter(([questionId, answer]) => {
                    const finalAnswer = getFinalAnswer(parseInt(questionId));
                    return finalAnswer && finalAnswer.trim() !== '';
                })
                .map(([questionId, answer]) => {
                    const questionIdInt = parseInt(questionId);
                    return {
                        audit_question_id: questionIdInt,
                        answer: answer === 'Others' ? customAnswers[questionIdInt].trim() : answer,
                        is_custom_answer: answer === 'Others'
                    };
                });

            if (validAnswers.length === 0) {
                setError('Please answer at least one question before submitting.');
                return;
            }

            const submissionData = {
                title: `Audit - ${new Date().toLocaleDateString()}`,
                answers: validAnswers
            };

            const response = await api.post('audit-submissions', submissionData);
            setSuccess('Form submitted successfully!');
            const resetAnswers = {};
            const resetCustomAnswers = {};
            questions.forEach(q => {
                resetAnswers[q.id] = '';
                resetCustomAnswers[q.id] = '';
            });
            setAnswers(resetAnswers);
            setCustomAnswers(resetCustomAnswers);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login', {
                    state: {
                        from: '/audit-form',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
            } else if (err.response?.status === 403) {
                setError('You do not have permission to submit audits.');
            } else {
                setError(err.response?.data?.message || 'Failed to submit form. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const isFormValid = () => {
        const totalQuestions = questions.length;
        const answeredQuestions = Object.entries(answers).filter(([questionId, answer]) => {
            const finalAnswer = getFinalAnswer(parseInt(questionId));
            return finalAnswer && finalAnswer.trim() !== '';
        }).length;
        return totalQuestions > 0 && answeredQuestions === totalQuestions;
    };

    const getProgressPercentage = () => {
        if (questions.length === 0) return 0;
        const answeredQuestions = Object.entries(answers).filter(([questionId, answer]) => {
            const finalAnswer = getFinalAnswer(parseInt(questionId));
            return finalAnswer && finalAnswer.trim() !== '';
        }).length;
        return Math.round((answeredQuestions / questions.length) * 100);
    };

    if (authLoading || loading) {
        return (
            <div className="container-fluid min-vh-100 bg-light d-flex justify-content-center align-items-center">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="fw-bold text-muted">Loading Form...</h5>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid min-vh-100 bg-light py-4">
            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-9">
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white border-0 py-3">
                            <h3 className="fw-bold text-primary mb-0">Audit Form</h3>
                        </div>
                        <div className="card-body py-4">
                            <div className="text-center mb-4">
                                <i className="bi bi-clipboard-check text-primary" style={{ fontSize: '2.5rem' }} aria-hidden="true"></i>
                                <p className="text-muted mt-2">Please answer all questions to complete the form.</p>
                            </div>
                            {questions.length > 0 && (
                                <div className="mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fw-semibold text-muted">Progress</span>
                                        <span className="fw-semibold text-muted">{getProgressPercentage()}% Complete</span>
                                    </div>
                                    <div className="progress" style={{ height: '10px' }}>
                                        <div 
                                            className="progress-bar bg-primary" 
                                            role="progressbar" 
                                            style={{ width: `${getProgressPercentage()}%` }}
                                            aria-valuenow={getProgressPercentage()} 
                                            aria-valuemin="0" 
                                            aria-valuemax="100"
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="alert alert-danger border-0 shadow-sm mb-4" role="alert">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
                                <p className="mb-0">{error}</p>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success border-0 shadow-sm mb-4" role="alert">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
                                <p className="mb-0">{success}</p>
                            </div>
                        </div>
                    )}

                    {questions.length > 0 && (
                        <form onSubmit={handleSubmit}>
                            {questions.map((question, index) => {
                                const isAnswered = getFinalAnswer(question.id)?.trim() !== '';
                                return (
                                    <div key={question.id} className="card border-0 shadow-sm mb-4">
                                        <div className="card-header bg-white border-0 py-3 d-flex align-items-center">
                                            <span className={`badge ${isAnswered ? 'bg-success' : 'bg-secondary'} rounded-pill me-3`} style={{ width: '30px', height: '30px', lineHeight: 'normal' }}>
                                                {isAnswered ? <i className="bi bi-check" aria-hidden="true"></i> : index + 1}
                                            </span>
                                            <h6 className="fw-bold mb-0">{question.question}</h6>
                                        </div>
                                        <div className="card-body">
                                            {question.description && (
                                                <p className="text-muted small mb-3">{question.description}</p>
                                            )}
                                            <div className="mb-3">
                                                <select
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className={`form-select form-select-sm ${isAnswered ? 'border-success' : 'border-secondary'}`}
                                                    required
                                                    aria-label={`Answer for question ${index + 1}`}
                                                >
                                                    <option value="">Select an answer...</option>
                                                    {question.possible_answers?.map((answer, answerIndex) => (
                                                        <option key={answerIndex} value={answer}>
                                                            {answer === 'Others' ? 'Others (specify below)' : answer}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            {answers[question.id] === 'Others' && (
                                                <div className="mb-3">
                                                    <label htmlFor={`custom-${question.id}`} className="form-label fw-semibold text-muted small">
                                                        Specify your answer
                                                    </label>
                                                    <textarea
                                                        id={`custom-${question.id}`}
                                                        value={customAnswers[question.id] || ''}
                                                        onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                                                        className="form-control form-control-sm"
                                                        rows="3"
                                                        placeholder="Provide your specific answer here..."
                                                        required
                                                        aria-label={`Custom answer for question ${index + 1}`}
                                                    />
                                                </div>
                                            )}
                                            {!isAnswered && (
                                                <div className="text-warning small">
                                                    <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
                                                    Please provide an answer.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="card border-0 shadow-sm bg-light">
                                <div className="card-body py-3">
                                    <div className="row align-items-center">
                                        <div className="col-md-8">
                                            <h6 className="fw-bold mb-2">Ready to Submit?</h6>
                                            <p className="text-muted small mb-2">
                                                <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                                                Ensure all questions are answered.
                                            </p>
                                            <span className="badge bg-primary me-2">{getProgressPercentage()}% Complete</span>
                                        </div>
                                        <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                            <button
                                                type="submit"
                                                disabled={submitting || !isFormValid()}
                                                className={`btn btn-sm ${isFormValid() ? 'btn-primary' : 'btn-outline-secondary'} px-4`}
                                                aria-label="Submit form"
                                            >
                                                {submitting ? (
                                                    <>
                                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                        Submitting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="bi bi-send-fill me-2" aria-hidden="true"></i>
                                                        Submit Form
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditForm;