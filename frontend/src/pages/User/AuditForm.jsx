import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

const AuditForm = () => {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        fetchQuestions();
    }, []);

    const fetchQuestions = async () => {
        try {
            const response = await api.get('/api/questions');
            setQuestions(response.data);
            // Initialize answers object with empty values
            const initialAnswers = {};
            response.data.forEach(q => {
                initialAnswers[q.id] = '';
            });
            setAnswers(initialAnswers);
        } catch (err) {
            setError('Failed to load audit questions. Please try again later.');
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
            const response = await api.post('/api/submissions', { answers });
            setSuccess(true);
            // Reset form
            const resetAnswers = {};
            questions.forEach(q => {
                resetAnswers[q.id] = '';
            });
            setAnswers(resetAnswers);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit audit. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Security Audit Assessment</h1>
                <p className="mt-2 text-sm text-gray-600">
                    Complete all questions below to receive your security risk assessment.
                </p>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 mb-6">
                    <div className="text-sm text-red-700">{error}</div>
                </div>
            )}

            {success && (
                <div className="rounded-md bg-green-50 p-4 mb-6">
                    <div className="text-sm text-green-700">
                        Audit submitted successfully! You can view your results in the submissions page.
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {questions.map((question) => (
                    <div key={question.id} className="bg-white shadow rounded-lg p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            {question.text}
                        </label>
                        <select
                            value={answers[question.id]}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            required
                        >
                            <option value="">Select an answer</option>
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                            <option value="not_applicable">Not Applicable</option>
                        </select>
                        {question.hint && (
                            <p className="mt-2 text-sm text-gray-500">{question.hint}</p>
                        )}
                    </div>
                ))}

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit Audit'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AuditForm;
