import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../api/axios';

const QuestionForm = ({ 
    isEdit = false, 
    questionData = null, 
    onClose, 
    onSuccess,
    title 
}) => {
    const [formData, setFormData] = useState({
        question: '',
        description: '',
        possible_answers: ['Yes', 'No', 'N/A'],
        risk_criteria: {
            high: [],
            medium: [],
            low: []
        }
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [newAnswer, setNewAnswer] = useState('');

    useEffect(() => {
        if (isEdit && questionData) {
            setFormData({
                question: questionData.question || '',
                description: questionData.description || '',
                possible_answers: questionData.possible_answers || ['Yes', 'No', 'N/A'],
                risk_criteria: {
                    high: Array.isArray(questionData.risk_criteria?.high) ? questionData.risk_criteria.high : [],
                    medium: Array.isArray(questionData.risk_criteria?.medium) ? questionData.risk_criteria.medium : [],
                    low: Array.isArray(questionData.risk_criteria?.low) ? questionData.risk_criteria.low : []
                }
            });
        }
    }, [isEdit, questionData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'question' && value.length > 1000) {
            setError('Question cannot exceed 1000 characters.');
            return;
        }
        if (name === 'description' && value.length > 2000) {
            setError('Description cannot exceed 2000 characters.');
            return;
        }
        setError(null);
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const addPossibleAnswer = () => {
        if (newAnswer.trim() && !formData.possible_answers.includes(newAnswer.trim())) {
            if (newAnswer.trim().length > 255) {
                setError('Possible answer cannot exceed 255 characters.');
                return;
            }
            setFormData(prev => ({
                ...prev,
                possible_answers: [...prev.possible_answers, newAnswer.trim()]
            }));
            setNewAnswer('');
            setError(null);
        } else if (formData.possible_answers.includes(newAnswer.trim())) {
            setError('This answer already exists.');
        }
    };

    const removePossibleAnswer = (index) => {
        const answerToRemove = formData.possible_answers[index];
        setFormData(prev => ({
            ...prev,
            possible_answers: prev.possible_answers.filter((_, i) => i !== index),
            risk_criteria: {
                high: prev.risk_criteria.high.filter(a => a !== answerToRemove),
                medium: prev.risk_criteria.medium.filter(a => a !== answerToRemove),
                low: prev.risk_criteria.low.filter(a => a !== answerToRemove)
            }
        }));
    };

    const handleRiskCriteriaChange = (level, answer) => {
        setFormData(prev => {
            const currentAnswers = prev.risk_criteria[level];
            let updatedAnswers;
            if (currentAnswers.includes(answer)) {
                updatedAnswers = currentAnswers.filter(a => a !== answer);
            } else {
                updatedAnswers = [...currentAnswers, answer];
            }
            return {
                ...prev,
                risk_criteria: {
                    ...prev.risk_criteria,
                    [level]: updatedAnswers
                }
            };
        });
        setError(null);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addPossibleAnswer();
        }
    };

    // Helper to get XSRF token from cookies
    function getXsrfToken() {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        console.log('Submitting form data:', formData);
        console.log('Token:', localStorage.getItem('token'));

        // Validation
        if (formData.possible_answers.length === 0) {
            setError('At least one possible answer is required.');
            setSubmitting(false);
            return;
        }

        // Validate risk criteria
        for (const level of ['high', 'medium', 'low']) {
            for (const answer of formData.risk_criteria[level]) {
                if (!formData.possible_answers.includes(answer)) {
                    setError(`Risk criteria for ${level} contains invalid answer: ${answer}`);
                    setSubmitting(false);
                    return;
                }
            }
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Pre-fetch CSRF token
            console.log('Pre-fetching CSRF token...');
            await axios.get('sanctum/csrf-cookie', {
                baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
                withCredentials: true
            });
            const csrfToken = getXsrfToken();
            if (!csrfToken) {
                throw new Error('Failed to retrieve CSRF token');
            }
            console.log('CSRF token fetched:', csrfToken);

            // Use raw axios with pre-fetched token
            const response = await axios.post('http://localhost:8000/api/audit-questions', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'X-XSRF-TOKEN': csrfToken
                },
                withCredentials: true
            });
            console.log('Response:', response.data);

            onSuccess();
            onClose();
        } catch (err) {
            console.error('Form submission error:', err.response ? err.response.data : err.message);
            if (err.response?.status === 401) {
                setError('Your session has expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else if (err.response?.status === 403) {
                setError('You do not have permission to perform this action.');
            } else if (err.response?.status === 422) {
                const errors = err.response.data.errors;
                const errorMessages = Object.values(errors).flat().join(' ');
                setError(errorMessages || 'Validation failed. Please check your inputs.');
            } else if (err.response?.status === 404) {
                setError('The API server could not be reached. Please ensure the backend is running at http://localhost:8000/api and try again.');
            } else if (err.response?.status === 409) {
                setError(err.response.data.message || 'Cannot modify question structure due to existing answers.');
            } else {
                setError(
                    err.response?.data?.message || 
                    err.message || 
                    `Failed to ${isEdit ? 'update' : 'create'} question. Please try again.`
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{title}</h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onClose}
                        ></button>
                    </div>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-danger mb-4">{error}</div>
                        )}
                        <form onSubmit={handleSubmit}>
                            <div className="mb-3">
                                <label htmlFor="question" className="form-label">Question Text *</label>
                                <textarea
                                    id="question"
                                    name="question"
                                    rows={3}
                                    required
                                    value={formData.question}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Enter the security audit question"
                                />
                                <small className="form-text text-muted">
                                    Max 1000 characters ({formData.question.length}/1000)
                                </small>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="description" className="form-label">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    rows={2}
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="Enter additional context or guidance"
                                />
                                <small className="form-text text-muted">
                                    Max 2000 characters ({formData.description.length}/2000)
                                </small>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Possible Answers *</label>
                                <div className="input-group mb-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Type a possible answer"
                                        value={newAnswer}
                                        onChange={(e) => setNewAnswer(e.target.value)}
                                        onKeyPress={handleKeyPress}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={addPossibleAnswer}
                                        disabled={!newAnswer.trim() || formData.possible_answers.includes(newAnswer.trim())}
                                    >
                                        Add
                                    </button>
                                </div>
                                <div className="border rounded p-2" style={{ minHeight: '60px', backgroundColor: '#f8f9fa' }}>
                                    {formData.possible_answers.length === 0 ? (
                                        <span className="text-muted">No possible answers added yet</span>
                                    ) : (
                                        <div className="d-flex flex-wrap gap-2">
                                            {formData.possible_answers.map((answer, index) => (
                                                <span key={index} className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: '0.875rem' }}>
                                                    {answer}
                                                    <button
                                                        type="button"
                                                        className="btn-close btn-close-white"
                                                        style={{ fontSize: '0.65rem' }}
                                                        onClick={() => removePossibleAnswer(index)}
                                                        aria-label="Remove answer"
                                                    ></button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-text">
                                    Type an answer (max 255 characters) and click "Add" or press Enter. Click the ✕ on a badge to remove it.
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Risk Criteria</label>
                                {['high', 'medium', 'low'].map(level => (
                                    <div key={level} className="mb-2">
                                        <label className={`form-label text-${level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success'}`}>
                                            {level.charAt(0).toUpperCase() + level.slice(1)} Risk Criteria
                                        </label>
                                        <div className="border rounded p-2" style={{ backgroundColor: '#f8f9fa' }}>
                                            {formData.possible_answers.length === 0 ? (
                                                <span className="text-muted">Add possible answers first</span>
                                            ) : (
                                                <div className="d-flex flex-wrap gap-2">
                                                    {formData.possible_answers.map((answer, index) => (
                                                        <div key={index} className="form-check">
                                                            <input
                                                                type="checkbox"
                                                                className="form-check-input"
                                                                id={`${level}-${answer}`}
                                                                checked={formData.risk_criteria[level].includes(answer)}
                                                                onChange={() => handleRiskCriteriaChange(level, answer)}
                                                            />
                                                            <label className="form-check-label" htmlFor={`${level}-${answer}`}>
                                                                {answer}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="form-text">
                                            Select answers that indicate {level} risk. Leave empty if not applicable.
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="d-flex justify-content-end gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn btn-primary"
                                >
                                    {submitting ? (isEdit ? 'Saving...' : 'Creating...') : (isEdit ? 'Save Changes' : 'Create Question')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuestionForm;