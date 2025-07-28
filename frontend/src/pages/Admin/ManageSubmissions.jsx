import React, { useState, useEffect, useCallback } from 'react';
import { 
    Search, 
    AlertTriangle, 
    CheckCircle, 
    AlertCircle, 
    Edit3, 
    Save, 
    X,
    Calendar,
    User,
    FileText,
    TrendingUp,
    AlertOctagon
} from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ManageSubmissions = () => {
    const { user, isAdmin, authLoading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user || !isAdmin) {
            navigate('/login');
            return;
        }
    }, [user, isAdmin, navigate]);
    const [submissions, setSubmissions] = useState([]);
    const [filteredSubmissions, setFilteredSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [editingAnswer, setEditingAnswer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [riskFilter, setRiskFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date_desc');

    const fetchSubmissions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Verify token exists
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            console.log('Making API request with token:', token);
            console.log('User role:', user?.role);
            
            const response = await api.get('/admin/audit-submissions');
            console.log('API Response:', response);
            
            if (response.data) {
                const mappedSubmissions = response.data.map(submission => ({
                    ...submission,
                    overall_risk: submission.admin_overall_risk || submission.system_overall_risk,
                    status: submission.status,
                    review_progress: submission.review_progress,
                    reviewer: submission.reviewer,
                    answers_count: submission.answers_count,
                    reviewed_answers_count: submission.reviewed_answers_count
                }));
                
                setSubmissions(mappedSubmissions);
                setError(null);
            } else {
                setSubmissions([]);
                setError('No submissions found.');
            }
        } catch (err) {
            console.error('Error fetching submissions:', err);
            console.error('Error response:', err.response);
            
            setSubmissions([]);
            
            // Handle different types of errors
            if (err.response?.status === 403) {
                setError('Access denied. You do not have permission to view audit submissions. Please ensure you are logged in as an admin.');
            } else if (err.response?.status === 401) {
                setError('Authentication failed. Please log in again.');
                // Redirect to login
                localStorage.removeItem('token');
                window.location.href = '/login';
            } else {
                setError(
                    err.response?.data?.message || 
                    err.message || 
                    'Failed to load submissions. Please try again later.'
                );
            }
        } finally {
            setLoading(false);
        }
    }, [user]); // Add user as dependency since we use user?.role inside

    useEffect(() => {
        if (!authLoading && user && isAdmin) {
            fetchSubmissions();
        } else if (!authLoading && user && !isAdmin) {
            setError('You do not have permission to access this page.');
            setLoading(false);
        }
    }, [user, isAdmin, authLoading, fetchSubmissions]);

    const filterAndSortSubmissions = useCallback(() => {
        let filtered = submissions.filter(submission => {
            const matchesSearch = submission.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                submission.user?.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesRisk = riskFilter === 'all' || submission.overall_risk === riskFilter;
            return matchesSearch && matchesRisk;
        });

        // Sort submissions
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'date_asc':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'risk_desc':
                    const riskOrder = { high: 3, medium: 2, low: 1 };
                    return riskOrder[b.overall_risk] - riskOrder[a.overall_risk];
                case 'risk_asc':
                    const riskOrderAsc = { high: 3, medium: 2, low: 1 };
                    return riskOrderAsc[a.overall_risk] - riskOrderAsc[b.overall_risk];
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        setFilteredSubmissions(filtered);
    }, [submissions, searchTerm, riskFilter, sortBy]);

    useEffect(() => {
        filterAndSortSubmissions();
    }, [filterAndSortSubmissions]);

    const handleAnswerRiskUpdate = async (answerId, newRiskLevel, newRecommendation) => {
        try {
            const reviewPayload = {
                admin_risk_level: newRiskLevel,
                admin_notes: '', // Add if needed
                recommendation: newRecommendation
            };

            const response = await api.put(`/audit-submissions/answers/${answerId}/review`, reviewPayload);

            // Update local state with the response
            const updatedAnswer = response.data.answer;
            const updatedSubmission = submissions.find(s => 
                s.answers.some(a => a.id === answerId)
            );

            if (updatedSubmission) {
                const newSubmissions = submissions.map(sub => {
                    if (sub.id === updatedSubmission.id) {
                        return {
                            ...sub,
                            answers: sub.answers.map(ans => 
                                ans.id === answerId ? updatedAnswer : ans
                            ),
                            status: response.data.submission_status,
                            review_progress: response.data.submission_progress
                        };
                    }
                    return sub;
                });

                setSubmissions(newSubmissions);
                setSelectedSubmission(newSubmissions.find(s => s.id === updatedSubmission.id));
                setEditingAnswer(null);
                // Recalculate overall risk after updating answer
                await recalculateOverallRisk(updatedSubmission.id);
            }
        } catch (err) {
            console.error('Error updating answer:', err);
            alert(err.response?.data?.message || 'Failed to update answer');
        }
    };

    const recalculateOverallRisk = async (submissionId) => {
        const submission = submissions.find(s => s.id === submissionId);
        if (!submission) return;

        const highCount = submission.answers.filter(a => a.risk_level === 'high').length;
        const mediumCount = submission.answers.filter(a => a.risk_level === 'medium').length;
        const total = submission.answers.length;

        const highPercentage = (highCount / total) * 100;
        const mediumPercentage = (mediumCount / total) * 100;

        let overallRisk = 'low';
        if (highPercentage >= 20 || highCount >= 2) {
            overallRisk = 'high';
        } else if (mediumPercentage >= 30 || mediumCount >= 3) {
            overallRisk = 'medium';
        }

        try {
            await api.put(`/audit-submissions/${submissionId}/risk`, {
                overall_risk: overallRisk
            });

            // Update local state
            setSelectedSubmission(prev => ({ ...prev, overall_risk: overallRisk }));
            setSubmissions(prev => prev.map(sub =>
                sub.id === submissionId ? { ...sub, overall_risk: overallRisk } : sub
            ));
        } catch (err) {
            console.error('Error updating overall risk:', err);
            setError('Failed to update overall risk level. Please try again.');
        }
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'high': return 'text-red-600 bg-red-50 border-red-200';
            case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
            case 'low': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getRiskIcon = (risk) => {
        switch (risk) {
            case 'high': return <AlertOctagon className="w-4 h-4" />;
            case 'medium': return <AlertTriangle className="w-4 h-4" />;
            case 'low': return <CheckCircle className="w-4 h-4" />;
            default: return <AlertCircle className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRiskStats = () => {
        const total = filteredSubmissions.length;
        const high = filteredSubmissions.filter(s => s.overall_risk === 'high').length;
        const medium = filteredSubmissions.filter(s => s.overall_risk === 'medium').length;
        const low = filteredSubmissions.filter(s => s.overall_risk === 'low').length;
        return { total, high, medium, low };
    };

    // Show loading while checking authentication
    if (authLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // Redirect if not authenticated or not admin
    if (!user || !isAdmin) {
        return (
            <div className="container py-4">
                <div className="alert alert-warning">
                    <h4>Access Denied</h4>
                    <p>You must be logged in as an admin to access this page.</p>
                    <a href="/login" className="btn btn-primary">Go to Login</a>
                </div>
            </div>
        );
    }

    const stats = getRiskStats();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Audit Submissions Management</h1>
                            <p className="text-gray-600 mt-1">Review and assess security audit submissions</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-6 text-sm">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                                    <span className="text-gray-600">High Risk: {stats.high}</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                                    <span className="text-gray-600">Medium Risk: {stats.medium}</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                                    <span className="text-gray-600">Low Risk: {stats.low}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Submissions List */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                            {/* Search and Filter Controls */}
                            <div className="p-4 border-b border-gray-200">
                                <div className="space-y-3">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search submissions..."
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {/* Filters */}
                                    <div className="flex space-x-2">
                                        <select
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            value={riskFilter}
                                            onChange={(e) => setRiskFilter(e.target.value)}
                                        >
                                            <option value="all">All Risk Levels</option>
                                            <option value="high">High Risk</option>
                                            <option value="medium">Medium Risk</option>
                                            <option value="low">Low Risk</option>
                                        </select>
                                        <select
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                        >
                                            <option value="date_desc">Newest First</option>
                                            <option value="date_asc">Oldest First</option>
                                            <option value="risk_desc">Highest Risk</option>
                                            <option value="risk_asc">Lowest Risk</option>
                                            <option value="title">Title A-Z</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Submissions List */}
                            <div className="max-h-96 overflow-y-auto">
                                {filteredSubmissions.map((submission) => (
                                    <div
                                        key={submission.id}
                                        className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                                            selectedSubmission?.id === submission.id ? 'bg-blue-50 border-blue-200' : ''
                                        }`}
                                        onClick={() => setSelectedSubmission(submission)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-medium text-gray-900 truncate">
                                                    {submission.title}
                                                </h3>
                                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                                    <User className="w-3 h-3 mr-1" />
                                                    <span className="truncate">{submission.user?.email}</span>
                                                </div>
                                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                                    <Calendar className="w-3 h-3 mr-1" />
                                                    <span>{formatDate(submission.created_at)}</span>
                                                </div>
                                            </div>
                                            <div className={`ml-2 px-2 py-1 rounded-full text-xs font-medium border ${getRiskColor(submission.overall_risk)}`}>
                                                <div className="flex items-center">
                                                    {getRiskIcon(submission.overall_risk)}
                                                    <span className="ml-1 capitalize">{submission.overall_risk}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredSubmissions.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>No submissions found</p>
                                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Submission Details */}
                    <div className="lg:col-span-2">
                        {selectedSubmission ? (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                {/* Submission Header */}
                                <div className="p-6 border-b border-gray-200">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-900">
                                                {selectedSubmission.title}
                                            </h2>
                                            <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                                                <div className="flex items-center">
                                                    <User className="w-4 h-4 mr-1" />
                                                    <span>{selectedSubmission.user?.email}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    <Calendar className="w-4 h-4 mr-1" />
                                                    <span>{formatDate(selectedSubmission.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-2 rounded-full text-sm font-medium border ${getRiskColor(selectedSubmission.overall_risk)}`}>
                                            <div className="flex items-center">
                                                {getRiskIcon(selectedSubmission.overall_risk)}
                                                <span className="ml-2 capitalize">Overall Risk: {selectedSubmission.overall_risk}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Answers Section */}
                                <div className="p-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Assessment</h3>
                                    <div className="space-y-4">
                                        {selectedSubmission.answers?.map((answer) => (
                                            <div key={answer.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                                                            {answer.question?.question}
                                                        </h4>
                                                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                                            {answer.question?.category}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => setEditingAnswer(editingAnswer === answer.id ? null : answer.id)}
                                                        className="ml-4 p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                                    <p className="text-sm text-gray-700">{answer.answer}</p>
                                                </div>

                                                {editingAnswer === answer.id ? (
                                                    <AnswerRiskEditor
                                                        answer={answer}
                                                        onSave={(riskLevel, recommendation) =>
                                                            handleAnswerRiskUpdate(answer.id, riskLevel, recommendation)
                                                        }
                                                        onCancel={() => setEditingAnswer(null)}
                                                    />
                                                ) : (
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getRiskColor(answer.risk_level)}`}>
                                                                {getRiskIcon(answer.risk_level)}
                                                                <span className="ml-2 capitalize">{answer.risk_level} Risk</span>
                                                            </div>
                                                            {answer.recommendation && (
                                                                <p className="text-sm text-gray-600 mt-2">
                                                                    <strong>Recommendation:</strong> {answer.recommendation}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                                <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Submission</h3>
                                <p className="text-gray-600">Choose a submission from the list to view and assess its risk levels.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Answer Risk Editor Component
const AnswerRiskEditor = ({ answer, onSave, onCancel }) => {
    const [riskLevel, setRiskLevel] = useState(answer.risk_level);
    const [recommendation, setRecommendation] = useState(answer.recommendation || '');

    const handleSave = () => {
        onSave(riskLevel, recommendation);
    };

    const riskOptions = [
        { value: 'low', label: 'Low Risk', color: 'text-green-600 bg-green-50 border-green-200' },
        { value: 'medium', label: 'Medium Risk', color: 'text-orange-600 bg-orange-50 border-orange-200' },
        { value: 'high', label: 'High Risk', color: 'text-red-600 bg-red-50 border-red-200' }
    ];

    return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Risk Assessment</h5>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
                    <div className="flex space-x-2">
                        {riskOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setRiskLevel(option.value)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    riskLevel === option.value
                                        ? option.color
                                        : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recommendation</label>
                    <textarea
                        value={recommendation}
                        onChange={(e) => setRecommendation(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your assessment and recommendations..."
                    />
                </div>

                <div className="flex justify-end space-x-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <X className="w-4 h-4 mr-1 inline" />
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Save className="w-4 h-4 mr-1 inline" />
                        Save Assessment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManageSubmissions;