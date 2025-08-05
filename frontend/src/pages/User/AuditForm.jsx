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
    const [expandedQuestions, setExpandedQuestions] = useState({});

    const fetchQuestions = React.useCallback(async () => {
        try {
            console.log('Fetching questions with user:', user);
            const response = await api.get('audit-questions');
            console.log('Questions response:', response.data);
            setQuestions(response.data);
            // Initialize answers object with empty values
            const initialAnswers = {};
            const initialCustomAnswers = {};
            response.data.forEach(q => {
                initialAnswers[q.id] = '';
                initialCustomAnswers[q.id] = '';
            });
            setAnswers(initialAnswers);
            setCustomAnswers(initialCustomAnswers);
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
            } else if (err.response?.status === 404) {
                setError('Audit questions endpoint not found. Please check your server configuration.');
            } else {
                setError(err.response?.data?.message || 'Failed to load audit questions. Please try again later.');
            }
        } finally {
            setLoading(false);
        }
    }, [user, navigate]);

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

        // Only users can submit audits as per API routes
        if (!user.role || user.role !== 'user') {
            setError('You do not have permission to submit audits. Required role: user');
            return;
        }
        
        fetchQuestions();
    }, [user, authLoading, navigate, fetchQuestions]);

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
        
        // Clear custom answer if not "Others"
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

    const toggleQuestionExpansion = (questionId) => {
        setExpandedQuestions(prev => ({
            ...prev,
            [questionId]: !prev[questionId]
        }));
    };

    const getFinalAnswer = (questionId) => {
        const answer = answers[questionId];
        if (answer === 'Others' && customAnswers[questionId]?.trim()) {
            return customAnswers[questionId].trim();
        }
        return answer;
    };

    const getRiskLevelForAnswer = (question, answer) => {
        if (!question.risk_criteria) return 'low';
        
        if (question.risk_criteria.high?.includes(answer)) {
            return 'high';
        } else if (question.risk_criteria.medium?.includes(answer)) {
            return 'medium';
        }
        return 'low';
    };

    const getRiskBadgeClass = (riskLevel) => {
        switch (riskLevel) {
            case 'high': return 'bg-danger';
            case 'medium': return 'bg-warning text-dark';
            case 'low': return 'bg-success';
            default: return 'bg-secondary';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        // Verify authentication status
        const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
        const token = localStorage.getItem('token');

        if (!token || !storedUser) {
            setError('Your session has expired. Please log in again.');
            navigate('/login', { 
                state: { 
                    from: '/audit-form',
                    message: 'Please log in to submit the audit form.'
                }
            });
            return;
        }

        try {
            // Format the data properly for the backend
            const validAnswers = Object.entries(answers)
                .filter(([questionId, answer]) => {
                    const finalAnswer = getFinalAnswer(parseInt(questionId));
                    return finalAnswer && finalAnswer.trim() !== '';
                })
                .map(([questionId, answer]) => {
                    const questionIdInt = parseInt(questionId);
                    
                    // Handle custom answers differently
                    if (answer === 'Others' && customAnswers[questionIdInt]?.trim()) {
                        // For custom answers, send "Others" as the answer and include custom text
                        return {
                            audit_question_id: questionIdInt,
                            answer: 'Others',
                            custom_answer: customAnswers[questionIdInt].trim(), // Add custom answer field
                            is_custom_answer: true
                        };
                    } else {
                        // For regular answers
                        return {
                            audit_question_id: questionIdInt,
                            answer: answer,
                            is_custom_answer: false
                        };
                    }
                });

            if (validAnswers.length === 0) {
                setError('Please answer at least one question before submitting.');
                return;
            }

            const submissionData = {
                title: `Security Audit - ${new Date().toLocaleDateString()}`,
                answers: validAnswers.map(answer => ({
                    ...answer,
                    status: 'pending',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }))
            };

            console.log('Submitting audit data:', submissionData);
            console.log('Number of questions:', questions.length);
            console.log('Number of valid answers:', validAnswers.length);
            console.log('Current answers state:', answers);
            console.log('Current custom answers state:', customAnswers);
            
            const response = await api.post('audit-submissions', submissionData);
            console.log('Submission successful:', response.data);
            
            // Show success message with status info
            setSuccess({
                message: response.data.message,
                status: response.data.status,
                systemRiskLevel: response.data.system_overall_risk
            });

            // Reset form
            const resetAnswers = {};
            const resetCustomAnswers = {};
            questions.forEach(q => {
                resetAnswers[q.id] = '';
                resetCustomAnswers[q.id] = '';
            });
            setAnswers(resetAnswers);
            setCustomAnswers(resetCustomAnswers);
            setExpandedQuestions({});

            // Scroll to top to show success message
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Error submitting audit:', err);
            
            if (err.response?.status === 401 || err.response?.status === 419) {
                console.error('Authentication/CSRF error:', err.response);
                navigate('/login', {
                    state: {
                        from: '/audit-form',
                        message: 'Your session has expired. Please log in again.'
                    }
                });
            } else if (err.response?.status === 403) {
                setError('You do not have permission to submit audits. Only users can submit audit assessments.');
            } else if (err.response?.status === 500) {
                const sqlError = err.response?.data?.error || err.response?.data?.message;
                if (sqlError?.includes('SQLSTATE')) {
                    console.error('Database error details:', sqlError);
                    
                    if (sqlError.includes('Column not found')) {
                        setError('The submission could not be processed due to a data format issue. Please contact support.');
                    } else {
                        setError('There was a problem saving your submission. Please try again later.');
                    }
                } else {
                    setError('Server error. Please ensure you have the correct permissions and try again.');
                }
            } else if (err.response?.status === 422) {
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
                    <h5 className="fw-bold text-muted">Loading Security Assessment...</h5>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid min-vh-100 bg-light py-4">
            <div className="row justify-content-center">
                <div className="col-lg-10 col-xl-9">
                    {/* Header Card */}
                    <div className="card border-0 shadow-sm mb-4">
                        <div className="card-header bg-white border-0 py-3">
                            <h3 className="fw-bold text-primary mb-0">Security Audit Assessment</h3>
                        </div>
                        <div className="card-body py-4">
                            <div className="text-center mb-4">
                                <i className="bi bi-shield-fill-check text-primary" style={{ fontSize: '2.5rem' }} aria-hidden="true"></i>
                                <p className="text-muted mt-2">Complete this assessment to help us understand your security posture.</p>
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

                    {/* Alerts */}
                    {error && (
                        <div className="alert alert-danger border-0 shadow-sm mb-4" role="alert">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-exclamation-triangle-fill me-2" aria-hidden="true"></i>
                                <div>
                                    <h6 className="fw-bold mb-1">Error</h6>
                                    <p className="mb-0">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success border-0 shadow-sm mb-4" role="alert">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-check-circle-fill me-2" aria-hidden="true"></i>
                                <div>
                                    <h6 className="fw-bold mb-2">Assessment Submitted Successfully!</h6>
                                    <p className="mb-2">{success.message}</p>
                                    <div className="row g-3">
                                        <div className="col-sm-6">
                                            <span className="fw-semibold text-muted">Status:</span>
                                            <span className="badge bg-primary ms-2">{success.status?.toUpperCase()}</span>
                                        </div>
                                        <div className="col-sm-6">
                                            <span className="fw-semibold text-muted">Risk Level:</span>
                                            <span className={`badge ${getRiskBadgeClass(success.systemRiskLevel)} ms-2`}>
                                                {success.systemRiskLevel?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Form */}
                    {questions.length > 0 && (
                        <form onSubmit={handleSubmit}>
                            {questions.map((question, index) => {
                                const isAnswered = getFinalAnswer(question.id)?.trim() !== '';
                                const currentAnswer = getFinalAnswer(question.id);
                                const riskLevel = currentAnswer ? getRiskLevelForAnswer(question, currentAnswer) : null;
                                const isExpanded = expandedQuestions[question.id];
                                
                                return (
                                    <div key={question.id} className="card border-0 shadow-sm mb-4">
                                        <div className="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center flex-grow-1">
                                                <span className={`badge ${isAnswered ? 'bg-success' : 'bg-secondary'} rounded-pill me-3`} style={{ width: '30px', height: '30px', lineHeight: 'normal' }}>
                                                    {isAnswered ? <i className="bi bi-check" aria-hidden="true"></i> : index + 1}
                                                </span>
                                                <h6 className="fw-bold mb-0 d-inline">
                                                    {question.question}
                                                    <span className="text-danger ms-1" aria-hidden="true">*</span>
                                                    {isAnswered && riskLevel && (
                                                        <span className={`badge ${getRiskBadgeClass(riskLevel)} ms-2`} style={{ fontSize: '0.75rem' }}>
                                                            {riskLevel.toUpperCase()} RISK
                                                        </span>
                                                    )}
                                                </h6>
                                            </div>
                                            <span
                                                className="badge bg-info text-dark ms-3 text-truncate"
                                                style={{
                                                    fontSize: '0.85rem',
                                                    maxWidth: '180px',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                                data-bs-toggle="tooltip"
                                                data-bs-placement="left"
                                                title={question.category || 'Uncategorized'}
                                                tabIndex={0}
                                            >
                                                {question.category || 'Uncategorized'}
                                            </span>
                                            {question.risk_criteria && (
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-primary btn-sm ms-2"
                                                    onClick={() => toggleQuestionExpansion(question.id)}
                                                    aria-label={isExpanded ? "Hide risk criteria" : "Show risk criteria"}
                                                >
                                                    <i className={`bi bi-info-circle${isExpanded ? '-fill' : ''}`} aria-hidden="true"></i>
                                                </button>
                                            )}
                                        </div>
                                        <div className="card-body">
                                            {question.description && (
                                                <p className="text-muted small mb-3">{question.description}</p>
                                            )}
                                            {isExpanded && question.risk_criteria && (
                                                <div className="alert alert-light border-start border-primary border-4 mb-3">
                                                    <h6 className="fw-bold text-primary mb-2">
                                                        <i className="bi bi-info-circle me-2" aria-hidden="true"></i>
                                                        Risk Assessment Criteria
                                                    </h6>
                                                    <div className="row g-3">
                                                        {question.risk_criteria.high && (
                                                            <div className="col-12">
                                                                <div className="d-flex align-items-start">
                                                                    <span className="badge bg-danger me-2 mt-1">HIGH</span>
                                                                    <span className="text-muted small">{Array.isArray(question.risk_criteria.high) ? question.risk_criteria.high.join(', ') : question.risk_criteria.high}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {question.risk_criteria.medium && (
                                                            <div className="col-12">
                                                                <div className="d-flex align-items-start">
                                                                    <span className="badge bg-warning text-dark me-2 mt-1">MED</span>
                                                                    <span className="text-muted small">{Array.isArray(question.risk_criteria.medium) ? question.risk_criteria.medium.join(', ') : question.risk_criteria.medium}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {question.risk_criteria.low && (
                                                            <div className="col-12">
                                                                <div className="d-flex align-items-start">
                                                                    <span className="badge bg-success me-2 mt-1">LOW</span>
                                                                    <span className="text-muted small">{Array.isArray(question.risk_criteria.low) ? question.risk_criteria.low.join(', ') : question.risk_criteria.low}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="mb-3">
                                                <select
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className={`form-select form-select-sm ${!answers[question.id] ? 'border-warning' : isAnswered ? 'border-success' : 'border-secondary'}`}
                                                    required
                                                    aria-label={`Answer for question ${index + 1}`}
                                                >
                                                    <option value="">Select an answer...</option>
                                                    {question.possible_answers?.map((answer, answerIndex) => (
                                                        <option key={answerIndex} value={answer}>
                                                            {answer}
                                                        </option>
                                                    ))}
                                                    {!question.possible_answers?.includes('Others') && (
                                                        <option value="Others">Others (specify below)</option>
                                                    )}
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
                                                    <small className="text-muted form-text">
                                                        <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                                                        Custom answers are assessed with low risk by default and may require manual review.
                                                    </small>
                                                </div>
                                            )}
                                            {!isAnswered && (
                                                <div className="text-warning small">
                                                    <i className="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
                                                    Please provide an answer for this question.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {questions.length > 0 && (
                                <div className="card border-0 shadow-sm bg-light">
                                    <div className="card-body py-3">
                                        <div className="row align-items-center">
                                            <div className="col-md-8">
                                                <h6 className="fw-bold mb-2">Ready to Submit?</h6>
                                                <p className="text-muted small mb-2">
                                                    <i className="bi bi-info-circle me-1" aria-hidden="true"></i>
                                                    Ensure all questions are answered before submitting.
                                                </p>
                                                <div>
                                                    <span className="badge bg-primary me-2">{getProgressPercentage()}% Complete</span>
                                                    <span className="text-muted small">
                                                        ({Object.values(answers).filter(a => getFinalAnswer(Object.keys(answers).find(key => answers[key] === a))?.trim()).length} of {questions.length} questions answered)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                                <button
                                                    type="submit"
                                                    disabled={submitting || !isFormValid()}
                                                    className={`btn btn-sm ${isFormValid() ? 'btn-primary' : 'btn-outline-secondary'} px-4`}
                                                    aria-label="Submit assessment"
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-send-fill me-2" aria-hidden="true"></i>
                                                            Submit Assessment
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditForm;