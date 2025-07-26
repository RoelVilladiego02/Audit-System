import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';

const getRiskLevelClass = (level) => {
    const classes = {
        high: 'bg-red-100 text-red-800 border-red-200',
        medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        low: 'bg-green-100 text-green-800 border-green-200'
    };
    return classes[level.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200';
};

const SubmissionDetails = () => {
    const { id } = useParams();
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSubmissionDetails();
    }, [id]);

    const fetchSubmissionDetails = async () => {
        try {
            const response = await api.get(`/api/submissions/${id}`);
            setSubmission(response.data);
        } catch (err) {
            setError('Failed to load submission details. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Audit Results #{submission?.id}
                    </h1>
                    <Link
                        to="/submissions"
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Back to Submissions
                    </Link>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                    Submitted on {new Date(submission?.created_at).toLocaleDateString()}
                </p>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {/* Risk Level Summary */}
                <div className={`px-4 py-5 sm:px-6 ${getRiskLevelClass(submission?.risk_level)}`}>
                    <h3 className="text-lg leading-6 font-medium">
                        Overall Risk Level: {submission?.risk_level.toUpperCase()}
                    </h3>
                    <p className="mt-1 text-sm">
                        {submission?.summary}
                    </p>
                </div>

                {/* Detailed Results */}
                <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Detailed Analysis
                    </h3>
                    <div className="space-y-6">
                        {submission?.answers.map((answer) => (
                            <div key={answer.question_id} className="border-b border-gray-200 pb-4 last:border-b-0">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="text-sm font-medium text-gray-900">
                                            {answer.question}
                                        </h4>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Your answer: {answer.answer}
                                        </p>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelClass(answer.risk_level)}`}>
                                        {answer.risk_level.toUpperCase()}
                                    </span>
                                </div>
                                {answer.recommendation && (
                                    <div className="mt-2 text-sm text-gray-600">
                                        <strong className="font-medium">Recommendation:</strong>{' '}
                                        {answer.recommendation}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recommendations Summary */}
                {submission?.recommendations && submission.recommendations.length > 0 && (
                    <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Key Recommendations
                        </h3>
                        <ul className="space-y-3">
                            {submission.recommendations.map((rec, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="flex-shrink-0 h-5 w-5 text-green-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </span>
                                    <p className="ml-2 text-sm text-gray-600">{rec}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SubmissionDetails;
