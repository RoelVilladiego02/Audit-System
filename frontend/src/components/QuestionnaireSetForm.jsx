import React, { useState, useEffect } from 'react';
import api from '../api/axios';

const QuestionnaireSetForm = ({ isEdit = false, setData = null, onClose, onSuccess, title }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft',
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && setData) {
      setFormData({
        name: setData.name || '',
        description: setData.description || '',
        status: setData.status || 'draft',
      });
    }
  }, [isEdit, setData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'name' && value.length > 255) {
      setError('Questionnaire set name cannot exceed 255 characters.');
      return;
    }
    if (name === 'description' && value.length > 2000) {
      setError('Description cannot exceed 2000 characters.');
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!formData.name.trim()) {
      setError('Questionnaire set name is required.');
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      let url, method;

      if (isEdit) {
        url = `/questionnaire-sets/${setData.id}`;
        method = 'put';
      } else {
        url = '/questionnaire-sets';
        method = 'post';
      }

      const response = await api({
        url,
        method,
        data: formData,
      });

      onSuccess(response.data?.data || response.data);
      onClose();
    } catch (err) {
      console.error('Form submission error:', err.response ? err.response.data : err.message);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to perform this action.');
      } else if (err.response?.status === 422) {
        const errors = err.response.data.errors;
        const errorMessages = Object.values(errors).flat().join(' ');
        setError(errorMessages || 'Validation failed. Please check your inputs.');
      } else if (err.response?.status === 409) {
        setError(err.response.data.message || 'This questionnaire set is currently in use and cannot be modified.');
      } else {
        setError(err.response?.data?.message || err.message || `Failed to ${isEdit ? 'update' : 'create'} questionnaire set. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-md">
        <div className="modal-content border-0 shadow-sm">
          <div className="modal-header bg-white border-bottom">
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
                <label htmlFor="name" className="form-label fw-semibold text-muted">
                  Questionnaire Set Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="e.g., Security Audit Q1 2025"
                  aria-describedby="nameHelp"
                />
                <small id="nameHelp" className="form-text text-muted">
                  Max 255 characters ({formData.name.length}/255)
                </small>
              </div>

              <div className="mb-3">
                <label htmlFor="description" className="form-label fw-semibold text-muted">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Enter a description for this questionnaire set (optional)"
                  aria-describedby="descriptionHelp"
                />
                <small id="descriptionHelp" className="form-text text-muted">
                  Max 2000 characters ({formData.description.length}/2000)
                </small>
              </div>

              <div className="mb-3">
                <label htmlFor="status" className="form-label fw-semibold text-muted">
                  Status <span className="text-danger">*</span>
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-select"
                  required
                  aria-describedby="statusHelp"
                >
                  <option value="draft">Draft (not available to users)</option>
                  <option value="active">Active (available for users to take)</option>
                  <option value="archived">Archived (no longer in use)</option>
                </select>
                <small id="statusHelp" className="form-text text-muted">
                  Only "Active" questionnaire sets are available for users to submit
                </small>
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
                  aria-label={isEdit ? 'Save set changes' : 'Create new set'}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      {isEdit ? 'Saving...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      {isEdit ? 'Save Changes' : 'Create Set'}
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

export default QuestionnaireSetForm;
