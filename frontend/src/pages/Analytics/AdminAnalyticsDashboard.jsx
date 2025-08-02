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
      <div className="container-fluid d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="text-center">
          <div className="mb-4">
            <i className="fas fa-shield-alt fa-4x text-danger mb-3"></i>
          </div>
          <div className="card shadow-lg border-0" style={{maxWidth: '400px'}}>
            <div className="card-body p-5">
              <h3 className="card-title text-danger mb-3">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Access Denied
              </h3>
              <p className="card-text text-muted mb-0">
                Administrator privileges are required to access this dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-muted">Loading Analytics Dashboard...</h5>
          <p className="text-muted small">Please wait while we fetch your data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid d-flex align-items-center justify-content-center vh-100 bg-light">
        <div className="text-center">
          <div className="mb-4">
            <i className="fas fa-exclamation-circle fa-4x text-danger mb-3"></i>
          </div>
          <div className="card shadow-lg border-0" style={{maxWidth: '500px'}}>
            <div className="card-body p-5">
              <h3 className="card-title text-danger mb-3">
                <i className="fas fa-times-circle me-2"></i>
                Error Loading Data
              </h3>
              <div className="alert alert-danger border-0 mb-4">
                <p className="mb-0">{error}</p>
              </div>
              <button className="btn btn-outline-danger btn-lg px-4" onClick={fetchAnalytics}>
                <i className="fas fa-redo me-2"></i>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon, color, subtitle }) => (
    <div className="col-md-3 col-sm-6 mb-4">
      <div className={`card border-0 shadow-sm h-100 border-start border-4 border-${color}`}>
        <div className="card-body p-4">
          <div className="d-flex align-items-center">
            <div className={`rounded-circle bg-${color} bg-opacity-10 p-3 me-3`}>
              <i className={`${icon} fa-lg text-${color}`}></i>
            </div>
            <div className="flex-grow-1">
              <h6 className="card-title text-muted mb-1 fw-normal">{title}</h6>
              <h2 className="mb-0 fw-bold">{value}</h2>
              {subtitle && <small className="text-muted">{subtitle}</small>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const ChartCard = ({ title, children, icon }) => (
    <div className="card border-0 shadow-sm h-100">
      <div className="card-header bg-white border-0 py-3">
        <h5 className="card-title mb-0 d-flex align-items-center">
          {icon && <i className={`${icon} me-2 text-primary`}></i>}
          {title}
        </h5>
      </div>
      <div className="card-body p-4">
        {children}
      </div>
    </div>
  );

  const renderVulnerabilityAnalytics = (data) => (
    <div>
      {/* Summary Cards */}
      <div className="row mb-5">
        <StatCard
          title="Total Submissions"
          value={data.totalSubmissions}
          icon="fas fa-bug"
          color="primary"
        />
        <StatCard
          title="Average Risk Score"
          value={data.averageRiskScore}
          icon="fas fa-tachometer-alt"
          color="info"
        />
        <StatCard
          title="Assignment Rate"
          value={`${data.assignmentStats?.assignmentRate || 0}%`}
          icon="fas fa-check-circle"
          color="success"
        />
        <StatCard
          title="Unassigned"
          value={data.assignmentStats?.unassigned || 0}
          icon="fas fa-clock"
          color="warning"
        />
      </div>

      <div className="row mb-4">
        {/* Risk Distribution */}
        <div className="col-lg-4 col-md-6 mb-4">
          <ChartCard title="Risk Level Distribution" icon="fas fa-exclamation-triangle">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={formatPieData(data.riskDistribution, riskColors)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
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
          </ChartCard>
        </div>

        {/* Status Distribution */}
        <div className="col-lg-4 col-md-6 mb-4">
          <ChartCard title="Status Distribution" icon="fas fa-tasks">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={formatPieData(data.statusDistribution, statusColors)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
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
          </ChartCard>
        </div>

        {/* Severity Distribution */}
        <div className="col-lg-4 col-md-6 mb-4">
          <ChartCard title="Severity Distribution" icon="fas fa-signal">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={formatPieData(data.severityDistribution, severityColors)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={90}
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
          </ChartCard>
        </div>
      </div>

      <div className="row">
        {/* Submission Trends */}
        <div className="col-lg-6 mb-4">
          <ChartCard title="Submission Trends" icon="fas fa-chart-line">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data.submissionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6c757d" />
                <YAxis stroke="#6c757d" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#007bff" strokeWidth={3} dot={{ fill: '#007bff', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Common Vulnerabilities */}
        <div className="col-lg-6 mb-4">
          <ChartCard title="Common Vulnerability Categories" icon="fas fa-list">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={data.commonVulnerabilities}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" stroke="#6c757d" />
                <YAxis stroke="#6c757d" />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#007bff" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolvedCount" fill="#28a745" name="Resolved" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );

  const renderAuditAnalytics = (data) => (
    <div>
      {/* Summary Cards */}
      <div className="row mb-5">
        <StatCard
          title="Total Submissions"
          value={data.totalSubmissions}
          icon="fas fa-clipboard-check"
          color="primary"
        />
        <StatCard
          title="Average Risk Score"
          value={data.averageRiskScore}
          icon="fas fa-tachometer-alt"
          color="info"
        />
        <StatCard
          title="High Risk Audits"
          value={data.riskDistribution?.high || 0}
          icon="fas fa-exclamation-triangle"
          color="warning"
        />
      </div>

      <div className="row">
        {/* Risk Distribution */}
        <div className="col-lg-6 mb-4">
          <ChartCard title="Risk Level Distribution" icon="fas fa-exclamation-triangle">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={formatPieData(data.riskDistribution, riskColors)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={100}
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
          </ChartCard>
        </div>

        {/* Submission Trends */}
        <div className="col-lg-6 mb-4">
          <ChartCard title="Submission Trends" icon="fas fa-chart-line">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.submissionTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6c757d" />
                <YAxis stroke="#6c757d" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#007bff" strokeWidth={3} dot={{ fill: '#007bff', strokeWidth: 2, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Common High Risk Questions */}
      <div className="row">
        <div className="col-12 mb-4">
          <ChartCard title="Common High-Risk Audit Questions" icon="fas fa-question-circle">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={data.commonHighRisks} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#6c757d" />
                <YAxis dataKey="question" type="category" width={250} stroke="#6c757d" />
                <Tooltip />
                <Bar dataKey="count" fill="#dc3545" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );

  const renderCombinedAnalytics = (data) => (
    <div>
      {/* Summary Cards */}
      <div className="row mb-5">
        <StatCard
          title="Total Submissions"
          value={data.summary.totalSubmissions}
          icon="fas fa-chart-bar"
          color="primary"
        />
        <StatCard
          title="Vulnerability Submissions"
          value={data.summary.vulnerabilitySubmissions}
          icon="fas fa-bug"
          color="success"
        />
        <StatCard
          title="Audit Submissions"
          value={data.summary.auditSubmissions}
          icon="fas fa-clipboard-check"
          color="info"
        />
        <StatCard
          title="High Risk Items"
          value={(data.vulnerability.riskDistribution?.high || 0) + (data.audit.riskDistribution?.high || 0)}
          icon="fas fa-exclamation-triangle"
          color="warning"
        />
      </div>

      {/* Vulnerability Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center mb-4">
          <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
            <i className="fas fa-bug text-primary"></i>
          </div>
          <h3 className="mb-0 text-primary fw-bold">Vulnerability Analytics</h3>
        </div>
        {renderVulnerabilityAnalytics(data.vulnerability)}
      </div>

      {/* Audit Section */}
      <div className="mb-5">
        <div className="d-flex align-items-center mb-4">
          <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
            <i className="fas fa-clipboard-check text-info"></i>
          </div>
          <h3 className="mb-0 text-info fw-bold">Audit Analytics</h3>
        </div>
        {renderAuditAnalytics(data.audit)}
      </div>
    </div>
  );

  return (
    <div className="container-fluid py-4 bg-light min-vh-100">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="bg-white rounded shadow-sm p-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
              <div className="mb-3 mb-md-0">
                <h1 className="h2 mb-2 fw-bold text-dark">
                  <i className="fas fa-chart-line me-3 text-primary"></i>
                  Analytics Dashboard
                </h1>
                <p className="text-muted mb-0">Comprehensive insights into your security data</p>
              </div>
              <button 
                className="btn btn-primary btn-lg px-4 shadow-sm" 
                onClick={fetchAnalytics}
                disabled={loading}
              >
                <i className="fas fa-sync-alt me-2"></i>
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
              <h5 className="card-title mb-0 d-flex align-items-center">
                <i className="fas fa-filter me-2 text-primary"></i>
                Filters & Options
              </h5>
            </div>
            <div className="card-body p-4">
              <div className="row g-3">
                <div className="col-lg-3 col-md-6">
                  <label className="form-label fw-semibold text-muted">
                    <i className="fas fa-database me-1"></i>
                    Data Type
                  </label>
                  <select
                    className="form-select form-select-lg shadow-sm"
                    value={dataType}
                    onChange={(e) => setDataType(e.target.value)}
                  >
                    <option value="all">📊 Combined Analytics</option>
                    <option value="vulnerability">🐛 Vulnerabilities</option>
                    <option value="audit">📋 Audits</option>
                  </select>
                </div>
                <div className="col-lg-3 col-md-6">
                  <label className="form-label fw-semibold text-muted">
                    <i className="fas fa-calendar me-1"></i>
                    Time Range
                  </label>
                  <select
                    className="form-select form-select-lg shadow-sm"
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value)}
                  >
                    <option value="week">📅 Last Week</option>
                    <option value="month">📅 Last Month</option>
                    <option value="quarter">📅 Last Quarter</option>
                    <option value="year">📅 Last Year</option>
                    <option value="all">📅 All Time</option>
                    <option value="custom">🗓️ Custom Range</option>
                  </select>
                </div>
                {timeRange === 'custom' && (
                  <>
                    <div className="col-lg-2 col-md-4">
                      <label className="form-label fw-semibold text-muted">Start Date</label>
                      <input
                        type="date"
                        className="form-control form-control-lg shadow-sm"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="col-lg-2 col-md-4">
                      <label className="form-label fw-semibold text-muted">End Date</label>
                      <input
                        type="date"
                        className="form-control form-control-lg shadow-sm"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                    <div className="col-lg-2 col-md-4 d-flex align-items-end">
                      <button
                        className="btn btn-success btn-lg w-100 shadow-sm"
                        onClick={handleCustomDateSubmit}
                        disabled={!customStartDate || !customEndDate}
                      >
                        <i className="fas fa-check me-2"></i>
                        Apply
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
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
  );
};

export default AdminAnalyticsDashboard;