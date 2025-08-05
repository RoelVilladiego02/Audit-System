import React, { useState, useEffect } from 'react';
import axios from 'axios';

const QuestionForm = ({ isEdit = false, questionData = null, onClose, onSuccess, title }) => {
  const [formData, setFormData] = useState({
    question: '',
    description: '',
    category: '',
    possible_answers: ['Yes', 'No', 'N/A'],
    risk_criteria: { high: [], medium: [], low: [] },
    allowCustomAnswers: false, // New field to track if "Others" should be included
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [newAnswer, setNewAnswer] = useState('');

  useEffect(() => {
    if (isEdit && questionData) {
      const hasOthers = questionData.possible_answers?.includes('Others') || false;
      setFormData({
        question: questionData.question || '',
        description: questionData.description || '',
        category: questionData.category || '',
        possible_answers: questionData.possible_answers || ['Yes', 'No', 'N/A'],
        risk_criteria: {
          high: Array.isArray(questionData.risk_criteria?.high) ? questionData.risk_criteria.high : [],
          medium: Array.isArray(questionData.risk_criteria?.medium) ? questionData.risk_criteria.medium : [],
          low: Array.isArray(questionData.risk_criteria?.low) ? questionData.risk_criteria.low : [],
        },
        allowCustomAnswers: hasOthers,
      });
    }
  }, [isEdit, questionData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'question' && value.length > 1000) {
      setError('Question cannot exceed 1000 characters.');
      return;
    }
    if (name === 'description' && value.length > 2000) {
      setError('Description cannot exceed 2000 characters.');
      return;
    }
    if (name === 'allowCustomAnswers') {
      setFormData((prev) => {
        const updatedPossibleAnswers = checked
          ? [...prev.possible_answers, 'Others'].filter((v, i, a) => a.indexOf(v) === i)
          : prev.possible_answers.filter((answer) => answer !== 'Others');
        return {
          ...prev,
          possible_answers: updatedPossibleAnswers,
          allowCustomAnswers: checked,
        };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setError(null);
  };

  const addPossibleAnswer = () => {
    if (newAnswer.trim() && !formData.possible_answers.includes(newAnswer.trim())) {
      if (newAnswer.trim().length > 255) {
        setError('Possible answer cannot exceed 255 characters.');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        possible_answers: [...prev.possible_answers, newAnswer.trim()],
      }));
      setNewAnswer('');
      setError(null);
    } else if (formData.possible_answers.includes(newAnswer.trim())) {
      setError('This answer already exists.');
    }
  };

  const removePossibleAnswer = (index) => {
    const answerToRemove = formData.possible_answers[index];
    if (answerToRemove === 'Others' && formData.allowCustomAnswers) {
      setError('Cannot remove "Others" while custom answers are enabled. Disable custom answers first.');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      possible_answers: prev.possible_answers.filter((_, i) => i !== index),
      risk_criteria: {
        high: prev.risk_criteria.high.filter((a) => a !== answerToRemove),
        medium: prev.risk_criteria.medium.filter((a) => a !== answerToRemove),
        low: prev.risk_criteria.low.filter((a) => a !== answerToRemove),
      },
    }));
  };

  const handleRiskCriteriaChange = (level, answer) => {
    if (answer === 'Others') {
      setError('Cannot assign "Others" to risk criteria. Custom answers are automatically assessed as low risk.');
      return;
    }
    setFormData((prev) => {
      const currentAnswers = prev.risk_criteria[level];
      let updatedAnswers;
      if (currentAnswers.includes(answer)) {
        updatedAnswers = currentAnswers.filter((a) => a !== answer);
      } else {
        updatedAnswers = [...currentAnswers, answer];
      }
      return {
        ...prev,
        risk_criteria: { ...prev.risk_criteria, [level]: updatedAnswers },
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

  function getXsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!formData.category.trim()) {
      setError('Category is required.');
      setSubmitting(false);
      return;
    }

    if (formData.possible_answers.length === 0) {
      setError('At least one possible answer is required.');
      setSubmitting(false);
      return;
    }

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

      await axios.get('sanctum/csrf-cookie', {
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
        withCredentials: true,
      });
      const csrfToken = getXsrfToken();
      if (!csrfToken) {
        throw new Error('Failed to retrieve CSRF token');
      }

      const url = `http://localhost:8000/api/audit-questions${isEdit ? `/${questionData.id}` : ''}`;
      const method = isEdit ? 'put' : 'post';

      await axios[method](url, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-XSRF-TOKEN': csrfToken,
        },
        withCredentials: true,
      });

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
        setError(err.response?.data?.message || err.message || `Failed to ${isEdit ? 'update' : 'create'} question. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 shadow-sm">
          <div className="modal-header bg-white">
            <h5 className="modal-title fw-bold">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close form"
            ></button>
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-circle-fill me-2"></i>
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="question" className="form-label fw-semibold text-muted">
                  Question Text <span className="text-danger">*</span>
                </label>
                <textarea
                  id="question"
                  name="question"
                  rows={3}
                  required
                  value={formData.question}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Enter the security audit question"
                  aria-describedby="questionHelp"
                />
                <small id="questionHelp" className="form-text text-muted">
                  Max 1000 characters (<span className="visually-hidden">Current count: </span>{formData.question.length}/1000)
                </small>
              </div>

              <div className="mb-3">
                <label htmlFor="category" className="form-label fw-semibold text-muted">
                  Category <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Enter category (e.g., Security, Compliance, Operations)"
                  aria-describedby="categoryHelp"
                />
                <small id="categoryHelp" className="form-text text-muted">
                  Specify the category for this question
                </small>
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label fw-semibold text-muted">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={2}
                  value={formData.description}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Enter additional context or guidance (optional)"
                  aria-describedby="descriptionHelp"
                />
                <small id="descriptionHelp" className="form-text text-muted">
                  Max 2000 characters (<span className="visually-hidden">Current count: </span>{formData.description.length}/2000)
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-muted">
                  Possible Answers <span className="text-danger">*</span>
                </label>
                <div className="form-check mb-2">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="allowCustomAnswers"
                    name="allowCustomAnswers"
                    checked={formData.allowCustomAnswers}
                    onChange={handleChange}
                    aria-label="Allow custom answers"
                  />
                  <label className="form-check-label" htmlFor="allowCustomAnswers">
                    Allow custom answers (adds "Others" option)
                  </label>
                  <small className="form-text text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Enabling this adds an "Others" option, allowing users to provide custom text answers, which are assessed as low risk by default.
                  </small>
                </div>
                <div className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Type a possible answer"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    onKeyPress={handleKeyPress}
                    aria-label="Add possible answer"
                    aria-describedby="addAnswerButton"
                  />
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={addPossibleAnswer}
                    disabled={!newAnswer.trim() || formData.possible_answers.includes(newAnswer.trim()) || newAnswer.trim() === 'Others'}
                    id="addAnswerButton"
                    aria-label="Add answer"
                  >
                    <i className="bi bi-plus-circle me-2"></i>Add
                  </button>
                </div>
                <div className="card border-0 shadow-sm">
                  <div className="card-body">
                    {formData.possible_answers.length === 0 ? (
                      <span className="text-muted">No possible answers added yet</span>
                    ) : (
                      <div className="d-flex flex-wrap gap-2">
                        {formData.possible_answers.map((answer, index) => (
                          <span
                            key={index}
                            className="badge bg-primary d-flex align-items-center gap-1"
                            style={{ fontSize: '0.875rem' }}
                          >
                            {answer}
                            <button
                              type="button"
                              className="btn-close btn-close-white"
                              style={{ fontSize: '0.65rem' }}
                              onClick={() => removePossibleAnswer(index)}
                              disabled={answer === 'Others' && formData.allowCustomAnswers}
                              aria-label={`Remove answer ${answer}`}
                            ></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <small className="form-text text-muted">
                  Type an answer (max 255 characters) and click "Add" or press Enter. Click the ✕ to remove an answer. The "Others" option cannot be added manually; use the checkbox above.
                </small>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-muted">Risk Criteria</label>
                <div className="accordion" id="riskCriteriaAccordion">
                  {['high', 'medium', 'low'].map((level, index) => (
                    <div key={level} className="accordion-item border-0 shadow-sm mb-2">
                      <h2 className="accordion-header">
                        <button
                          className={`accordion-button ${index === 0 ? '' : 'collapsed'}`}
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#${level}RiskCollapse`}
                          aria-expanded={index === 0 ? 'true' : 'false'}
                          aria-controls={`${level}RiskCollapse`}
                        >
                          <span
                            className={`text-${
                              level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success'
                            }`}
                          >
                            <i
                              className={`bi bi-exclamation-triangle-fill me-2 text-${
                                level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success'
                              }`}
                            ></i>
                            {level.charAt(0).toUpperCase() + level.slice(1)} Risk Criteria
                          </span>
                        </button>
                      </h2>
                      <div
                        id={`${level}RiskCollapse`}
                        className={`accordion-collapse collapse ${index === 0 ? 'show' : ''}`}
                        data-bs-parent="#riskCriteriaAccordion"
                      >
                        <div className="accordion-body">
                          {formData.possible_answers.length === 0 ? (
                            <span className="text-muted">Add possible answers first</span>
                          ) : (
                            <div className="d-flex flex-wrap gap-2">
                              {formData.possible_answers
                                .filter((answer) => answer !== 'Others')
                                .map((answer, ansIndex) => (
                                  <div key={ansIndex} className="form-check">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      id={`${level}-${answer}`}
                                      checked={formData.risk_criteria[level].includes(answer)}
                                      onChange={() => handleRiskCriteriaChange(level, answer)}
                                      aria-label={`Assign ${answer} to ${level} risk`}
                                    />
                                    <label className="form-check-label" htmlFor={`${level}-${answer}`}>
                                      {answer}
                                    </label>
                                  </div>
                                ))}
                            </div>
                          )}
                          <small className="form-text text-muted">
                            Select answers that indicate {level} risk. Leave empty if not applicable. "Others" cannot be assigned to risk criteria as custom answers are assessed as low risk.
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                  disabled={submitting}
                  aria-label="Cancel form"
                >
                  <i className="bi bi-x-circle me-2"></i>Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  aria-label={isEdit ? 'Save question changes' : 'Create new question'}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {isEdit ? 'Saving...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      {isEdit ? 'Save Changes' : 'Create Question'}
                    </>
                  )}
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