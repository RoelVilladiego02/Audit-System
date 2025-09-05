import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../auth/useAuth';

const AuditForm = () => {
    const { user, loading: authLoading, updateUser } = useAuth();
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

        // Validate current user authentication
        const currentUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        console.log('Submitting audit for user:', {
            token: token ? 'Present' : 'Missing',
            user: currentUser ? JSON.parse(currentUser) : 'No user data',
            userId: currentUser ? JSON.parse(currentUser).id : 'No user ID'
        });
        
        if (!token || !currentUser) {
            setError('Your session has expired. Please log in again.');
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in to submit the form.'
                }
            });
            return;
        }

        // Force refresh user data to ensure we have the latest authentication
        try {
            console.log('Refreshing user authentication before submission...');
            const userResponse = await api.get('/user');
            const freshUserData = userResponse.data;
            
            console.log('Fresh user data:', {
                id: freshUserData.id,
                name: freshUserData.name,
                email: freshUserData.email
            });
            
            // Update localStorage with fresh user data
            localStorage.setItem('user', JSON.stringify(freshUserData));
            
            // Update the user context with fresh data
            updateUser(freshUserData);
            console.log('Updated user context with fresh data');
            
            // Verify the user ID matches (use fresh data for comparison)
            if (freshUserData.id !== user?.id) {
                console.warn('User ID mismatch detected - using fresh data:', {
                    contextUser: user?.id,
                    freshUser: freshUserData.id
                });
                // Don't return error, just use the fresh data
                console.log('Using fresh user data for submission validation');
            }
        } catch (authError) {
            console.error('Failed to refresh user authentication:', authError);
            setError('Authentication error. Please log out and log in again.');
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in again to submit the form.'
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
            
            // Log the full response structure for debugging
            console.log('Submission response structure:', {
                fullResponse: response.data,
                submission: response.data?.submission,
                userId: response.data?.submission?.user_id
            });
            
            // Validate that the submission was created with the correct user ID
            const submittedUserId = response.data?.submission?.user_id;
            const currentUserId = user?.id;
            const freshUserId = JSON.parse(localStorage.getItem('user'))?.id;
            
            console.log('Submission validation:', {
                submittedUserId,
                contextUserId: currentUserId,
                freshUserId: freshUserId,
                matches: submittedUserId === freshUserId
            });
            
            // Use fresh user ID for validation since context might be stale
            if (submittedUserId !== freshUserId) {
                console.error('CRITICAL: Submission created with wrong user ID!', {
                    expected: freshUserId,
                    actual: submittedUserId,
                    contextUser: currentUserId
                });
                setError('Error: Submission was created with incorrect user ID. Please try again.');
                return;
            }
            
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
                                {user && (
                                    <div className="alert alert-info border-0 mt-3" style={{ fontSize: '0.9rem' }}>
                                        <i className="bi bi-person-circle me-2"></i>
                                        <strong>Logged in as:</strong> {user.name} (ID: {user.id})
                                    </div>
                                )}
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

                    {/* Category Overview Section */}
                    {questions.length > 0 && (
                        <div className="card border-0 shadow-sm mb-4">
                            <div className="card-header bg-white border-0 py-3">
                                <h6 className="fw-bold text-primary mb-0">
                                    <i className="bi bi-grid-3x3-gap me-2" aria-hidden="true"></i>
                                    Form Categories Overview
                                </h6>
                            </div>
                            <div className="card-body py-3">
                                <div className="row g-2">
                                    {(() => {
                                        const categories = [...new Set(questions.map(q => q.category).filter(Boolean))];
                                        return categories.map((category, index) => {
                                            const categoryQuestions = questions.filter(q => q.category === category);
                                            const answeredInCategory = categoryQuestions.filter(q => getFinalAnswer(q.id)?.trim() !== '').length;
                                            const progressPercentage = Math.round((answeredInCategory / categoryQuestions.length) * 100);
                                            
                                            return (
                                                <div key={index} className="col-md-6 col-lg-4">
                                                    <div className="d-flex align-items-center p-2 border rounded" style={{ backgroundColor: '#f8f9fa' }}>
                                                        <div className="flex-grow-1">
                                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                                <span className="fw-semibold text-dark small">{category}</span>
                                                                <span className="badge bg-primary bg-opacity-10 text-primary small">
                                                                    {answeredInCategory}/{categoryQuestions.length}
                                                                </span>
                                                            </div>
                                                            <div className="progress" style={{ height: '4px' }}>
                                                                <div 
                                                                    className="progress-bar bg-primary" 
                                                                    role="progressbar" 
                                                                    style={{ width: `${progressPercentage}%` }}
                                                                    aria-valuenow={progressPercentage} 
                                                                    aria-valuemin="0" 
                                                                    aria-valuemax="100"
                                                                ></div>
                                                            </div>
                                                            <small className="text-muted">
                                                                Questions: {categoryQuestions.map((q, idx) => questions.indexOf(q) + 1).join(', ')}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}

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
                                        <div className="card-header bg-white border-0 py-3">
                                            <div className="d-flex align-items-center mb-2">
                                                <span className={`badge ${isAnswered ? 'bg-success' : 'bg-secondary'} rounded-pill me-3`} style={{ width: '30px', height: '30px', lineHeight: 'normal' }}>
                                                    {isAnswered ? <i className="bi bi-check" aria-hidden="true"></i> : index + 1}
                                                </span>
                                                <h6 className="fw-bold mb-0 flex-grow-1">{question.question}</h6>
                                            </div>
                                            {question.category && (
                                                <div className="d-flex align-items-center">
                                                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-2 py-1 rounded-pill me-2">
                                                        <i className="bi bi-tag me-1" aria-hidden="true"></i>
                                                        {question.category}
                                                    </span>
                                                    <small className="text-muted">
                                                        <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                                                        Question {index + 1} of {questions.length}
                                                    </small>
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-body">
                                            {question.description && (
                                                <div className="alert alert-light border-0 mb-3" style={{ backgroundColor: '#f8f9fa' }}>
                                                    <div className="d-flex align-items-start">
                                                        <i className="bi bi-info-circle text-info me-2 mt-1" aria-hidden="true"></i>
                                                        <div>
                                                            <small className="text-muted fw-semibold d-block mb-1">Additional Information:</small>
                                                            <p className="text-muted small mb-0">{question.description}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mb-3">
                                                <label htmlFor={`answer-${question.id}`} className="form-label fw-semibold text-dark small mb-2">
                                                    <i className="bi bi-check-circle me-1" aria-hidden="true"></i>
                                                    Your Answer
                                                </label>
                                                <select
                                                    id={`answer-${question.id}`}
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className={`form-select ${isAnswered ? 'border-success bg-success bg-opacity-10' : 'border-secondary'}`}
                                                    required
                                                    aria-label={`Answer for question ${index + 1}`}
                                                >
                                                    <option value="">Choose your answer...</option>
                                                    {question.possible_answers?.map((answer, answerIndex) => (
                                                        <option key={answerIndex} value={answer}>
                                                            {answer === 'Others' ? 'Others (specify below)' : answer}
                                                        </option>
                                                    ))}
                                                </select>
                                                {isAnswered && (
                                                    <div className="mt-2">
                                                        <small className="text-success fw-semibold">
                                                            <i className="bi bi-check-circle-fill me-1" aria-hidden="true"></i>
                                                            Answer recorded
                                                        </small>
                                                    </div>
                                                )}
                                            </div>
                                            {answers[question.id] === 'Others' && (
                                                <div className="mb-3">
                                                    <div className="alert alert-warning border-0 mb-2" style={{ backgroundColor: '#fff3cd' }}>
                                                        <div className="d-flex align-items-center">
                                                            <i className="bi bi-pencil-square text-warning me-2" aria-hidden="true"></i>
                                                            <small className="text-warning fw-semibold">Custom Answer Required</small>
                                                        </div>
                                                    </div>
                                                    <label htmlFor={`custom-${question.id}`} className="form-label fw-semibold text-dark small">
                                                        <i className="bi bi-chat-text me-1" aria-hidden="true"></i>
                                                        Please specify your answer
                                                    </label>
                                                    <textarea
                                                        id={`custom-${question.id}`}
                                                        value={customAnswers[question.id] || ''}
                                                        onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                                                        className="form-control"
                                                        rows="3"
                                                        placeholder="Provide your specific answer here..."
                                                        required
                                                        aria-label={`Custom answer for question ${index + 1}`}
                                                    />
                                                    <div className="form-text">
                                                        <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                                                        Please provide a detailed answer that best describes your situation.
                                                    </div>
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