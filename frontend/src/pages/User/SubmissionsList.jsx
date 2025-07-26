import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const getRiskLevelClass = (level) => {
    const classes = {
        high: 'bg-red-100 text-red-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800'
    };
    return classes[level.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

const SubmissionsList = () => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSubmissions();
    }, []);

    const fetchSubmissions = async () => {
        try {
            const response = await api.get('/api/submissions');
            setSubmissions(response.data);
        } catch (err) {
            setError('Failed to load submissions. Please try again later.');
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
                <h1 className="text-3xl font-bold text-gray-900">Your Audit Submissions</h1>
                <p className="mt-2 text-sm text-gray-600">
                    View and analyze your previous security audit submissions.
                </p>
            </div>

            {submissions.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500 mb-4">No submissions found.</p>
                    <Link
                        to="/audit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        Start New Audit
                    </Link>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        {submissions.map((submission) => (
                            <li key={submission.id}>
                                <Link 
                                    to={`/submissions/${submission.id}`}
                                    className="block hover:bg-gray-50"
                                >
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <p className="text-sm font-medium text-indigo-600 truncate">
                                                    Audit Submission #{submission.id}
                                                </p>
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Submitted on {new Date(submission.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskLevelClass(submission.risk_level)}`}>
                                                    {submission.risk_level.toUpperCase()} RISK
                                                </span>
                                                <svg className="ml-4 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </div>
                                        {submission.summary && (
                                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                                                {submission.summary}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SubmissionsList;
