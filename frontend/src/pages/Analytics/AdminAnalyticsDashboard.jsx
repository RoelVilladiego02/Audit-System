import React, { useState, useEffect } from 'react';
import axios from '../../api/axios';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
    Filler
);

const AnalyticsDashboard = () => {
    const [user] = useState({ id: 1, isAdmin: true }); // TODO: Replace with useAuth hook
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('month');
    const [type, setType] = useState('all');
    const [departmentData, setDepartmentData] = useState([]);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                setError(null);
                
                console.log('Fetching analytics with params:', {
                    timeRange,
                    userId: user?.isAdmin ? undefined : user.id,
                    type
                });
                
                const response = await axios.get('/api/analytics', {
                    params: {
                        timeRange,
                        type,
                        ...(user?.isAdmin ? {} : { userId: user.id })
                    }
                });
                
                console.log('API Response:', response.data);
                
                if (!response.data) {
                    throw new Error('No data received from the API');
                }
                
                const data = response.data;
                
                // Handle different response types
                let processedData = {};
                if (data.type === 'vulnerability') {
                    // Handle vulnerability type response
                    processedData = {
                        ...data,
                        submissionTrends: {
                            labels: data.submissionTrends.map(t => t.date),
                            data: data.submissionTrends.map(t => t.count)
                        }
                    };
                } else if (data.type === 'audit') {
                    // Handle audit type response
                    processedData = {
                        ...data,
                        submissionTrends: {
                            labels: data.submissionTrends.map(t => t.date),
                            data: data.submissionTrends.map(t => t.count)
                        },
                        commonVulnerabilities: data.commonHighRisks?.map(item => ({
                            category: item.question,
                            count: item.count
                        })) || []
                    };
                } else {
                    // Handle combined data
                    const vulnData = data.vulnerability;
                    processedData = {
                        ...vulnData,
                        totalSubmissions: data.summary.totalSubmissions,
                        auditData: data.audit,
                        submissionTrends: {
                            labels: vulnData.submissionTrends.map(t => t.date),
                            data: vulnData.submissionTrends.map(t => t.count)
                        }
                    };
                }
                
                setAnalyticsData(processedData);
                setDepartmentData(processedData.departmentAnalysis || []);
                
                console.log('Processed Data:', processedData);
            } catch (err) {
                console.error('API Error:', err);
                setError(err.response?.data?.message || 'Failed to fetch analytics data');
                console.error('Analytics fetch error:', err);
                setAnalyticsData({
                    totalSubmissions: 0,
                    riskDistribution: { high: 0, medium: 0, low: 0 },
                    averageRiskScore: 0,
                    resolvedIssues: 0,
                    highRiskFindings: 0,
                    completionRate: 0,
                    submissionTrends: {
                        labels: [],
                        data: []
                    },
                    commonVulnerabilities: []
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [timeRange, type, user]);

    const riskDistributionData = {
        labels: ['High Risk', 'Medium Risk', 'Low Risk'],
        datasets: [{
            data: [
                analyticsData?.riskDistribution?.high || 0,
                analyticsData?.riskDistribution?.medium || 0,
                analyticsData?.riskDistribution?.low || 0
            ],
            backgroundColor: [
                'rgba(220, 53, 69, 0.8)',
                'rgba(255, 193, 7, 0.8)',
                'rgba(25, 135, 84, 0.8)'
            ],
            borderColor: [
                'rgb(220, 53, 69)',
                'rgb(255, 193, 7)',
                'rgb(25, 135, 84)'
            ],
            borderWidth: 2
        }]
    };

    const submissionTrendData = {
        labels: analyticsData?.submissionTrends?.labels || [],
        datasets: [{
            label: 'Submissions',
            data: analyticsData?.submissionTrends?.data || [],
            fill: true,
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            borderColor: 'rgb(13, 110, 253)',
            tension: 0.4,
            pointBackgroundColor: 'rgb(13, 110, 253)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2
        }]
    };

    const commonVulnerabilitiesData = {
        labels: analyticsData?.commonVulnerabilities?.map(v => v.category) || [],
        datasets: [{
            label: 'Frequency',
            data: analyticsData?.commonVulnerabilities?.map(v => v.count) || [],
            backgroundColor: [
                'rgba(220, 53, 69, 0.8)',
                'rgba(255, 193, 7, 0.8)', 
                'rgba(25, 135, 84, 0.8)',
                'rgba(13, 110, 253, 0.8)',
                'rgba(111, 66, 193, 0.8)'
            ],
            borderColor: [
                'rgb(220, 53, 69)',
                'rgb(255, 193, 7)',
                'rgb(25, 135, 84)',
                'rgb(13, 110, 253)',
                'rgb(111, 66, 193)'
            ],
            borderWidth: 1,
            borderRadius: 4
        }]
    };

    const departmentAnalysisData = {
        labels: departmentData.map(d => d.name) || [],
        datasets: [{
            label: 'Risk Score',
            data: departmentData.map(d => d.averageRiskScore) || [],
            backgroundColor: 'rgba(13, 110, 253, 0.8)',
            borderColor: 'rgb(13, 110, 253)',
            borderWidth: 1,
            borderRadius: 4
        }, {
            label: 'Completion Rate',
            data: departmentData.map(d => d.completionRate) || [],
            backgroundColor: 'rgba(25, 135, 84, 0.8)',
            borderColor: 'rgb(25, 135, 84)',
            borderWidth: 1,
            borderRadius: 4
        }]
    };

    if (loading) {
        return (
            <div className="container-fluid bg-light min-vh-100 d-flex align-items-center justify-content-center">
                <div className="text-center">
                    <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="text-muted">Loading analytics data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid bg-light min-vh-100">
            <div className="container-lg py-4">
                {/* Header Section */}
                <div className="row mb-4">
                    <div className="col-lg-8">
                        <h1 className="display-6 fw-bold text-dark mb-2">Security Analytics</h1>
                        <p className="text-muted lead mb-0">
                            {user?.isAdmin 
                                ? 'Comprehensive security audit analytics across all submissions.'
                                : 'Analysis of your security audit submissions.'}
                        </p>
                    </div>
                    <div className="col-lg-4 d-flex align-items-center justify-content-lg-end mt-3 mt-lg-0">
                        <div className="d-flex align-items-center">
                            <label htmlFor="timeRange" className="form-label me-2 mb-0 fw-medium">
                                Time Range:
                            </label>
                            <div className="d-flex gap-3">
                                <select
                                    id="timeRange"
                                    value={timeRange}
                                    onChange={(e) => setTimeRange(e.target.value)}
                                    className="form-select form-select-sm"
                                    style={{ width: '150px' }}
                                >
                                    <option value="month">Last Month</option>
                                    <option value="quarter">Last Quarter</option>
                                    <option value="year">Last Year</option>
                                </select>
                                <select
                                    id="type"
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="form-select form-select-sm"
                                    style={{ width: '150px' }}
                                >
                                    <option value="all">All Submissions</option>
                                    <option value="vulnerability">Vulnerabilities</option>
                                    <option value="audit">Audits</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-2" style={{ fontSize: '1rem' }}></i>
                        <div>{error}</div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="row g-3 mb-4">
                    <div className="col-sm-6 col-lg-3">
                        <div className="card bg-primary text-white h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0 me-3">
                                        <i className="bi bi-file-earmark-text" style={{ fontSize: '1.5rem' }}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="small text-white-50 fw-medium">Total Submissions</div>
                                        <div className="h4 fw-bold mb-0">{analyticsData?.totalSubmissions?.toLocaleString() || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-sm-6 col-lg-3">
                        <div className="card bg-danger text-white h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0 me-3">
                                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '1.5rem' }}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="small text-white-50 fw-medium">High Risk Issues</div>
                                        <div className="h4 fw-bold mb-0">{analyticsData?.riskDistribution?.high || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-sm-6 col-lg-3">
                        <div className="card bg-warning text-white h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0 me-3">
                                        <i className="bi bi-bar-chart" style={{ fontSize: '1.5rem' }}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="small text-white-50 fw-medium">Average Risk Score</div>
                                        <div className="h4 fw-bold mb-0">{analyticsData?.averageRiskScore?.toFixed(1) || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-sm-6 col-lg-3">
                        <div className="card bg-success text-white h-100">
                            <div className="card-body">
                                <div className="d-flex align-items-center">
                                    <div className="flex-shrink-0 me-3">
                                        <i className="bi bi-check-circle" style={{ fontSize: '1.5rem' }}></i>
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className="small text-white-50 fw-medium">Resolved Issues</div>
                                        <div className="h4 fw-bold mb-0">{analyticsData?.resolvedIssues || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                <div className="row g-4">
                    {/* Risk Distribution Chart */}
                    <div className="col-lg-6">
                        <div className="card h-100">
                            <div className="card-header bg-white border-bottom">
                                <div className="d-flex align-items-center justify-content-between">
                                    <h5 className="card-title mb-0 fw-semibold">Risk Distribution</h5>
                                    <small className="text-muted d-flex align-items-center">
                                        <i className="bi bi-info-circle me-1" style={{ fontSize: '0.875rem' }}></i>
                                        Breakdown by severity
                                    </small>
                                </div>
                            </div>
                            <div className="card-body">
                                <div style={{ height: '280px', position: 'relative' }}>
                                    <Doughnut 
                                        data={riskDistributionData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: {
                                                        padding: 15,
                                                        usePointStyle: true,
                                                        font: {
                                                            size: 12
                                                        }
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submission Trends Chart */}
                    <div className="col-lg-6">
                        <div className="card h-100">
                            <div className="card-header bg-white border-bottom">
                                <div className="d-flex align-items-center justify-content-between">
                                    <h5 className="card-title mb-0 fw-semibold">Submission Trends</h5>
                                    <small className="text-muted d-flex align-items-center">
                                        <i className="bi bi-graph-up me-1" style={{ fontSize: '0.875rem' }}></i>
                                        Trend analysis
                                    </small>
                                </div>
                            </div>
                            <div className="card-body">
                                <div style={{ height: '280px', position: 'relative' }}>
                                    <Line 
                                        data={submissionTrendData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    display: false
                                                }
                                            },
                                            scales: {
                                                y: {
                                                    beginAtZero: true
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Department Analysis Chart */}
                    {user?.isAdmin && (
                        <div className="col-12">
                            <div className="card">
                                <div className="card-header bg-white border-bottom">
                                    <div className="d-flex align-items-center justify-content-between">
                                        <h5 className="card-title mb-0 fw-semibold">Department Analysis</h5>
                                        <small className="text-muted d-flex align-items-center">
                                            <i className="bi bi-building me-1" style={{ fontSize: '0.875rem' }}></i>
                                            Department performance metrics
                                        </small>
                                    </div>
                                </div>
                                <div className="card-body">
                                    <div style={{ height: '350px', position: 'relative' }}>
                                        <Bar 
                                            data={departmentAnalysisData}
                                            options={{
                                                responsive: true,
                                                maintainAspectRatio: false,
                                                plugins: {
                                                    legend: {
                                                        position: 'top',
                                                        labels: {
                                                            font: {
                                                                size: 12
                                                            }
                                                        }
                                                    }
                                                },
                                                scales: {
                                                    y: {
                                                        beginAtZero: true,
                                                        max: 100
                                                    }
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Common Vulnerabilities Chart */}
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header bg-white border-bottom">
                                <div className="d-flex align-items-center justify-content-between">
                                    <h5 className="card-title mb-0 fw-semibold">Common Vulnerabilities</h5>
                                    <small className="text-muted d-flex align-items-center">
                                        <i className="bi bi-shield-exclamation me-1" style={{ fontSize: '0.875rem' }}></i>
                                        Top security issues
                                    </small>
                                </div>
                            </div>
                            <div className="card-body">
                                <div style={{ height: '350px', position: 'relative' }}>
                                    <Bar 
                                        data={commonVulnerabilitiesData}
                                        options={{
                                            indexAxis: 'y',
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    display: false
                                                }
                                            },
                                            scales: {
                                                x: {
                                                    beginAtZero: true
                                                }
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;