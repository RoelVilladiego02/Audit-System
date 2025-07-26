import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        totalQuestions: 0,
        totalSubmissions: 0,
        highRiskSubmissions: 0,
        recentSubmissions: []
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // TODO: Replace with actual API call
                const response = await fetch('/api/admin/dashboard-stats');
                const data = await response.json();
                setStats(data);
            } catch (err) {
                setError('Failed to load dashboard statistics');
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="container py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Welcome, {user?.name}</h1>
                <Link to="/admin/questions/create" className="btn btn-primary">
                    Create New Question
                </Link>
            </div>

            <div className="row g-4">
                <div className="col-md-6 col-lg-4">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">Manage Questions</h5>
                            <p className="card-text">View, edit, and manage audit questions and their categories.</p>
                            <Link to="/admin/questions" className="btn btn-primary">
                                Manage Questions
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-lg-4">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">Analytics Dashboard</h5>
                            <p className="card-text">View comprehensive analytics and reports from all submissions.</p>
                            <Link to="/analytics" className="btn btn-primary">
                                View Analytics
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="col-md-6 col-lg-4">
                    <div className="card h-100">
                        <div className="card-body">
                            <h5 className="card-title">System Settings</h5>
                            <p className="card-text">Configure system settings and manage user permissions.</p>
                            <button className="btn btn-primary" disabled>
                                Coming Soon
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-4 mb-6">
                    <div className="text-sm text-red-700">{error}</div>
                </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Questions</dt>
                                    <dd className="text-3xl font-semibold text-gray-900">{stats.totalQuestions}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link to="/admin/questions" className="font-medium text-indigo-600 hover:text-indigo-900">
                                Manage questions
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">Total Submissions</dt>
                                    <dd className="text-3xl font-semibold text-gray-900">{stats.totalSubmissions}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link to="/analytics" className="font-medium text-indigo-600 hover:text-indigo-900">
                                View analytics
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                                <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">High Risk Submissions</dt>
                                    <dd className="text-3xl font-semibold text-gray-900">{stats.highRiskSubmissions}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link to="/analytics" className="font-medium text-indigo-600 hover:text-indigo-900">
                                View risk analysis
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Submissions */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:px-6">
                    <h2 className="text-lg font-medium text-gray-900">Recent Submissions</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Latest security audit submissions from users.
                    </p>
                </div>
                <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                        {stats.recentSubmissions.map((submission) => (
                            <li key={submission.id} className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <p className="text-sm font-medium text-indigo-600">
                                            Submission #{submission.id}
                                        </p>
                                        <p className="mt-1 text-xs text-gray-500">
                                            by {submission.user_name} on {new Date(submission.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        submission.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                                        submission.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-green-100 text-green-800'
                                    }`}>
                                        {submission.risk_level.toUpperCase()} RISK
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
