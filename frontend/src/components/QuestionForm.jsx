import React, { useState, useEffect } from 'react';
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
            high: '',
            medium: '',
            low: ''
        }
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [newAnswer, setNewAnswer] = useState('');

    useEffect(() => {
        if (isEdit && questionData) {
            // Map API response data to form fields
            setFormData({
                question: questionData.question || '',
                description: questionData.description || '',
                possible_answers: questionData.possible_answers || ['Yes', 'No', 'N/A'],
                risk_criteria: questionData.risk_criteria || {
                    high: '',
                    medium: '',
                    low: ''
                }
            });
        }
    }, [isEdit, questionData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const addPossibleAnswer = () => {
        if (newAnswer.trim() && !formData.possible_answers.includes(newAnswer.trim())) {
            setFormData(prev => ({
                ...prev,
                possible_answers: [...prev.possible_answers, newAnswer.trim()]
            }));
            setNewAnswer('');
        }
    };

    const removePossibleAnswer = (index) => {
        setFormData(prev => ({
            ...prev,
            possible_answers: prev.possible_answers.filter((_, i) => i !== index)
        }));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addPossibleAnswer();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        // Validation
        if (formData.possible_answers.length === 0) {
            setError('At least one possible answer is required.');
            setSubmitting(false);
            return;
        }

        try {
            // Ensure token exists
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Authentication token not found');
            }

            // Make API request with proper authorization
            if (isEdit) {
                await api.put(`/api/audit-questions/${questionData.id}`, formData);
            } else {
                await api.post('/api/audit-questions', formData);
            }
            
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Form submission error:', err);
            
            if (err.response?.status === 401) {
                setError('Your session has expired. Please log in again.');
                // Redirect to login after a brief delay
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else if (err.response?.status === 403) {
                setError('You do not have permission to perform this action.');
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
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Possible Answers *</label>
                                
                                {/* Add new answer input */}
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

                                {/* Display current answers */}
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
                                    Type an answer and click "Add" or press Enter. Click the ✕ on a badge to remove it.
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Risk Criteria</label>
                                <div className="mb-2">
                                    <label htmlFor="risk_criteria_high" className="form-label text-danger">High Risk Criteria</label>
                                    <textarea
                                        id="risk_criteria_high"
                                        name="risk_criteria.high"
                                        value={formData.risk_criteria.high}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            risk_criteria: {
                                                ...prev.risk_criteria,
                                                high: e.target.value
                                            }
                                        }))}
                                        className="form-control"
                                        placeholder="Criteria for high risk assessment"
                                        rows={2}
                                    />
                                </div>
                                <div className="mb-2">
                                    <label htmlFor="risk_criteria_medium" className="form-label text-warning">Medium Risk Criteria</label>
                                    <textarea
                                        id="risk_criteria_medium"
                                        name="risk_criteria.medium"
                                        value={formData.risk_criteria.medium}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            risk_criteria: {
                                                ...prev.risk_criteria,
                                                medium: e.target.value
                                            }
                                        }))}
                                        className="form-control"
                                        placeholder="Criteria for medium risk assessment"
                                        rows={2}
                                    />
                                </div>
                                <div className="mb-2">
                                    <label htmlFor="risk_criteria_low" className="form-label text-success">Low Risk Criteria</label>
                                    <textarea
                                        id="risk_criteria_low"
                                        name="risk_criteria.low"
                                        value={formData.risk_criteria.low}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            risk_criteria: {
                                                ...prev.risk_criteria,
                                                low: e.target.value
                                            }
                                        }))}
                                        className="form-control"
                                        placeholder="Criteria for low risk assessment"
                                        rows={2}
                                    />
                                </div>
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