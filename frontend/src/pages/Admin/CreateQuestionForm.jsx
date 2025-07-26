import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const CreateQuestionForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        text: '',
        hint: '',
        category: '',
        weight: 1
    });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            await api.post('/api/questions', formData);
            navigate('/admin/questions');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create question. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="container py-4">
            <div className="mb-4">
                <h1 className="display-5">Create New Question</h1>
                <p className="text-muted">
                    Add a new question to the security audit assessment.
                </p>
            </div>

            {error && (
                <div className="alert alert-danger mb-4">
                    {error}
                </div>
            )}

            <div className="card">
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label htmlFor="text" className="form-label">
                                Question Text *
                            </label>
                            <textarea
                                id="text"
                                name="text"
                                rows={3}
                                required
                                value={formData.text}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="Enter the security audit question"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="hint" className="form-label">
                                Hint/Description
                            </label>
                            <textarea
                                id="hint"
                                name="hint"
                                rows={2}
                                value={formData.hint}
                                onChange={handleChange}
                                className="form-control"
                                placeholder="Enter additional context or guidance for answering this question"
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="category" className="form-label">
                                Category
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="">Select a category</option>
                                <option value="access_control">Access Control</option>
                                <option value="data_protection">Data Protection</option>
                                <option value="network_security">Network Security</option>
                                <option value="application_security">Application Security</option>
                                <option value="incident_response">Incident Response</option>
                                <option value="compliance">Compliance</option>
                            </select>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="weight" className="form-label">
                                Risk Weight
                            </label>
                            <select
                                id="weight"
                                name="weight"
                                value={formData.weight}
                                onChange={handleChange}
                                className="form-select"
                            >
                                <option value="1">Low (1)</option>
                                <option value="2">Medium (2)</option>
                                <option value="3">High (3)</option>
                            </select>
                            <div className="form-text">
                                Higher weights indicate more critical security concerns.
                            </div>
                        </div>

                        <div className="d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                onClick={() => navigate('/admin/questions')}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn btn-primary"
                            >
                                {submitting ? 'Creating...' : 'Create Question'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateQuestionForm;
