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
        setSuccess(false);

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
            <div className="container-fluid d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <h5 className="text-muted">Loading Security Assessment...</h5>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="row justify-content-center">
                <div className="col-lg-8 col-xl-7">
                    {/* Header Card */}
                    <div className="card shadow-sm border-0 mb-4">
                        <div className="card-body text-center py-5">
                            <div className="mb-3">
                                <i className="bi bi-shield-check text-primary" style={{ fontSize: '3rem' }}></i>
                            </div>
                            <h1 className="card-title h2 mb-3 text-primary">Security Audit Assessment</h1>
                            <p className="lead text-muted mb-4">
                                Help us understand your security posture by completing this comprehensive assessment.
                            </p>
                            {questions.length > 0 && (
                                <div className="mb-0">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <small className="text-muted">Progress</small>
                                        <small className="text-muted">{getProgressPercentage()}% Complete</small>
                                    </div>
                                    <div className="progress" style={{ height: '8px' }}>
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
                            <div className="d-flex align-items-start">
                                <i className="bi bi-exclamation-triangle-fill me-3 mt-1 text-danger"></i>
                                <div>
                                    <h6 className="alert-heading mb-1">Error</h6>
                                    <div>{error}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success border-0 shadow-sm mb-4" role="alert">
                            <div className="d-flex align-items-start">
                                <i className="bi bi-check-circle-fill me-3 mt-1 text-success"></i>
                                <div className="flex-grow-1">
                                    <h6 className="alert-heading mb-2">Assessment Submitted Successfully!</h6>
                                    <p className="mb-2">{success.message}</p>
                                    <div className="row g-2">
                                        <div className="col-sm-6">
                                            <div className="small">
                                                <strong>Status:</strong> 
                                                <span className="badge bg-info ms-2">{success.status?.toUpperCase()}</span>
                                            </div>
                                        </div>
                                        <div className="col-sm-6">
                                            <div className="small">
                                                <strong>Risk Level:</strong>
                                                <span className={`badge ${getRiskBadgeClass(success.systemRiskLevel)} ms-2`}>
                                                    {success.systemRiskLevel?.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Form */}
                    {questions.length === 0 && !error ? (
                        <div className="card border-0 shadow-sm">
                            <div className="card-body text-center py-5">
                                <i className="bi bi-info-circle text-info mb-3" style={{ fontSize: '2rem' }}></i>
                                <h5 className="text-muted mb-0">No audit questions are currently available.</h5>
                                <p className="text-muted small mt-2">Please check back later or contact support.</p>
                            </div>
                        </div>
                    ) : questions.length > 0 && (
                        <form onSubmit={handleSubmit}>
                            {questions.map((question, index) => {
                                const isAnswered = getFinalAnswer(question.id)?.trim() !== '';
                                const currentAnswer = getFinalAnswer(question.id);
                                const riskLevel = currentAnswer ? getRiskLevelForAnswer(question, currentAnswer) : null;
                                const isExpanded = expandedQuestions[question.id];
                                
                                return (
                                    <div key={question.id} className="card border-0 shadow-sm mb-4">
                                        <div className="card-body">
                                            {/* Question Header */}
                                            <div className="d-flex align-items-start mb-3">
                                                <div className="me-3">
                                                    <div className={`badge ${isAnswered ? 'bg-success' : 'bg-secondary'} rounded-pill d-flex align-items-center justify-content-center`} style={{ width: '32px', height: '32px', fontSize: '14px' }}>
                                                        {isAnswered ? <i className="bi bi-check"></i> : index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-grow-1">
                                                    <h6 className="card-title mb-2 text-dark">
                                                        {question.question}
                                                        <span className="text-danger ms-1">*</span>
                                                        {isAnswered && riskLevel && (
                                                            <span className={`badge ${getRiskBadgeClass(riskLevel)} ms-2`} style={{ fontSize: '0.7em' }}>
                                                                {riskLevel.toUpperCase()} RISK
                                                            </span>
                                                        )}
                                                    </h6>
                                                    {question.description && (
                                                        <p className="text-muted small mb-3">{question.description}</p>
                                                    )}
                                                </div>
                                                {question.risk_criteria && (
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-info btn-sm ms-2"
                                                        onClick={() => toggleQuestionExpansion(question.id)}
                                                        title="View risk criteria"
                                                    >
                                                        <i className={`bi bi-info-circle${isExpanded ? '-fill' : ''}`}></i>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Risk Criteria Expansion */}
                                            {isExpanded && question.risk_criteria && (
                                                <div className="alert alert-light border-start border-info border-4 mb-3">
                                                    <h6 className="text-info mb-2">
                                                        <i className="bi bi-info-circle me-2"></i>
                                                        Risk Assessment Criteria
                                                    </h6>
                                                    <div className="row g-2">
                                                        {question.risk_criteria.high && (
                                                            <div className="col-12">
                                                                <div className="d-flex align-items-start">
                                                                    <span className="badge bg-danger me-2 mt-1">HIGH</span>
                                                                    <small className="text-dark">{Array.isArray(question.risk_criteria.high) ? question.risk_criteria.high.join(', ') : question.risk_criteria.high}</small>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {question.risk_criteria.medium && (
                                                            <div className="col-12">
                                                                <div className="d-flex align-items-start">
                                                                    <span className="badge bg-warning text-dark me-2 mt-1">MED</span>
                                                                    <small className="text-dark">{Array.isArray(question.risk_criteria.medium) ? question.risk_criteria.medium.join(', ') : question.risk_criteria.medium}</small>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {question.risk_criteria.low && (
                                                            <div className="col-12">
                                                                <div className="d-flex align-items-start">
                                                                    <span className="badge bg-success me-2 mt-1">LOW</span>
                                                                    <small className="text-dark">{Array.isArray(question.risk_criteria.low) ? question.risk_criteria.low.join(', ') : question.risk_criteria.low}</small>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Answer Selection */}
                                            <div className="mb-3">
                                                <select
                                                    value={answers[question.id] || ''}
                                                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                                                    className={`form-select form-select-lg ${!answers[question.id] ? 'border-warning' : isAnswered ? 'border-success' : 'border-secondary'}`}
                                                    required
                                                >
                                                    <option value="">Choose your answer...</option>
                                                    {question.possible_answers?.map((answer, answerIndex) => (
                                                        <option key={answerIndex} value={answer}>
                                                            {answer}
                                                        </option>
                                                    ))}
                                                    <option value="Others">Others (specify below)</option>
                                                </select>
                                            </div>

                                            {/* Custom Answer Input */}
                                            {answers[question.id] === 'Others' && (
                                                <div className="mb-3">
                                                    <label htmlFor={`custom-${question.id}`} className="form-label small text-muted">
                                                        Please specify your answer:
                                                    </label>
                                                    <textarea
                                                        id={`custom-${question.id}`}
                                                        value={customAnswers[question.id] || ''}
                                                        onChange={(e) => handleCustomAnswerChange(question.id, e.target.value)}
                                                        className="form-control"
                                                        rows="3"
                                                        placeholder="Please provide your specific answer here..."
                                                        required
                                                    />
                                                    <div className="form-text">
                                                        <i className="bi bi-info-circle me-1"></i>
                                                        Custom answers will be assessed with low risk by default and may require manual review.
                                                    </div>
                                                </div>
                                            )}

                                            {/* Validation Feedback */}
                                            {!isAnswered && (
                                                <div className="text-warning small">
                                                    <i className="bi bi-exclamation-triangle me-1"></i>
                                                    Please provide an answer for this question.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Submit Section */}
                            {questions.length > 0 && (
                                <div className="card border-0 shadow-sm bg-light">
                                    <div className="card-body">
                                        <div className="row align-items-center">
                                            <div className="col-md-8">
                                                <h6 className="mb-2">Ready to Submit?</h6>
                                                <div className="text-muted small">
                                                    <i className="bi bi-info-circle me-1"></i>
                                                    Please ensure all questions are answered before submitting your assessment.
                                                </div>
                                                <div className="mt-2">
                                                    <span className="badge bg-primary me-2">{getProgressPercentage()}% Complete</span>
                                                    <span className="small text-muted">
                                                        ({Object.values(answers).filter(a => getFinalAnswer(Object.keys(answers).find(key => answers[key] === a))?.trim()).length} of {questions.length} questions answered)
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                                <button
                                                    type="submit"
                                                    disabled={submitting || !isFormValid()}
                                                    className={`btn btn-lg ${isFormValid() ? 'btn-primary' : 'btn-outline-secondary'} px-4`}
                                                >
                                                    {submitting ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-send me-2"></i>
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