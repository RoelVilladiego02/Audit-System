import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import api from '../../api/axios';

const AdminAnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('week');
  const [dataType, setDataType] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Check if user is admin
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      setError('Unauthorized: Admin access required');
      setLoading(false);
      return;
    }
    fetchAnalytics();
  }, [timeRange, dataType, isAdmin]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        timeRange,
        type: dataType
      };

      if (timeRange === 'custom') {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }

      const response = await api.get('/analytics', { params });
      setAnalyticsData(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomDateSubmit = (e) => {
    e.preventDefault();
    if (customStartDate && customEndDate) {
      fetchAnalytics();
    }
  };

  // Color schemes for charts
  const riskColors = {
    high: '#dc3545',
    medium: '#ffc107',
    low: '#28a745'
  };

  const statusColors = {
    open: '#dc3545',
    in_progress: '#ffc107',
    resolved: '#28a745',
    closed: '#6c757d'
  };

  const severityColors = {
    high: '#dc3545',
    medium: '#fd7e14',
    low: '#20c997'
  };

  // Helper function to format pie chart data
  const formatPieData = (data, colors) => {
    return Object.entries(data).map(([key, value]) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),
      value: value,
      fill: colors[key] || '#6c757d'
    }));
  };

  // Custom label function for pie charts
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
    if (percent < 0.05) return null; // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {value > 0 ? value : ''}
      </text>
    );
  };

  if (!isAdmin) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Access Denied</h4>
          <p>You must be an administrator to access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error</h4>
          <p>{error}</p>
          <button className="btn btn-outline-danger" onClick={fetchAnalytics}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderVulnerabilityAnalytics = (data) => (
    <div className="row">
      {/* Summary Cards */}
      <div className="col-12 mb-4">
        <div className="row">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h5 className="card-title">Total Submissions</h5>
                <h2>{data.totalSubmissions}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h5 className="card-title">Avg Risk Score</h5>
                <h2>{data.averageRiskScore}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h5 className="card-title">Assignment Rate</h5>
                <h2>{data.assignmentStats?.assignmentRate || 0}%</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-white">
              <div className="card-body">
                <h5 className="card-title">Unassigned</h5>
                <h2>{data.assignmentStats?.unassigned || 0}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h5>Risk Level Distribution</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formatPieData(data.riskDistribution, riskColors)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formatPieData(data.riskDistribution, riskColors).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h5>Status Distribution</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formatPieData(data.statusDistribution, statusColors)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formatPieData(data.statusDistribution, statusColors).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h5>Severity Distribution</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formatPieData(data.severityDistribution, severityColors)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formatPieData(data.severityDistribution, severityColors).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Submission Trends */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h5>Submission Trends</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.submissionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Common Vulnerabilities */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5>Common Vulnerability Categories</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.commonVulnerabilities}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Total" />
                <Bar dataKey="resolvedCount" fill="#82ca9d" name="Resolved" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAuditAnalytics = (data) => (
    <div className="row">
      {/* Summary Cards */}
      <div className="col-12 mb-4">
        <div className="row">
          <div className="col-md-4">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h5 className="card-title">Total Submissions</h5>
                <h2>{data.totalSubmissions}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h5 className="card-title">Avg Risk Score</h5>
                <h2>{data.averageRiskScore}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-warning text-white">
              <div className="card-body">
                <h5 className="card-title">High Risk Audits</h5>
                <h2>{data.riskDistribution?.high || 0}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h5>Risk Level Distribution</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formatPieData(data.riskDistribution, riskColors)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {formatPieData(data.riskDistribution, riskColors).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Submission Trends */}
      <div className="col-md-6 mb-4">
        <div className="card">
          <div className="card-header">
            <h5>Submission Trends</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.submissionTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Common High Risk Questions */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5>Common High-Risk Audit Questions</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.commonHighRisks} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="question" type="category" width={200} />
                <Tooltip />
                <Bar dataKey="count" fill="#dc3545" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCombinedAnalytics = (data) => (
    <div className="row">
      {/* Summary Cards */}
      <div className="col-12 mb-4">
        <div className="row">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h5 className="card-title">Total Submissions</h5>
                <h2>{data.summary.totalSubmissions}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h5 className="card-title">Vulnerability Submissions</h5>
                <h2>{data.summary.vulnerabilitySubmissions}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h5 className="card-title">Audit Submissions</h5>
                <h2>{data.summary.auditSubmissions}</h2>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-white">
              <div className="card-body">
                <h5 className="card-title">High Risk Items</h5>
                <h2>{(data.vulnerability.riskDistribution?.high || 0) + (data.audit.riskDistribution?.high || 0)}</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vulnerability Section */}
      <div className="col-12 mb-4">
        <h4 className="text-primary">Vulnerability Analytics</h4>
        {renderVulnerabilityAnalytics(data.vulnerability)}
      </div>

      {/* Audit Section */}
      <div className="col-12 mb-4">
        <h4 className="text-info">Audit Analytics</h4>
        {renderAuditAnalytics(data.audit)}
      </div>
    </div>
  );

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h2">Analytics Dashboard</h1>
            <button className="btn btn-outline-primary" onClick={fetchAnalytics}>
              <i className="fas fa-sync-alt me-2"></i>
              Refresh
            </button>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">
                  <label className="form-label">Data Type</label>
                  <select
                    className="form-select"
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value)}
                  >
                    <option value="all">Combined</option>
                    <option value="vulnerability">Vulnerabilities</option>
                    <option value="audit">Audits</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Time Range</label>
                  <select
                    className="form-select"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="quarter">Last Quarter</option>
                    <option value="year">Last Year</option>
                    <option value="all">All Time</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>
                {timeRange === 'custom' && (
                  <>
                    <div className="col-md-2">
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                    <div className="col-md-2 d-flex align-items-end">
                      <button
                        className="btn btn-primary"
                        onClick={handleCustomDateSubmit}
                        disabled={!customStartDate || !customEndDate}
                      >
                        Apply
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Analytics Content */}
          {analyticsData && (
            <div className="analytics-content">
              {analyticsData.type === 'vulnerability' && renderVulnerabilityAnalytics(analyticsData)}
              {analyticsData.type === 'audit' && renderAuditAnalytics(analyticsData)}
              {analyticsData.type === 'combined' && renderCombinedAnalytics(analyticsData)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;