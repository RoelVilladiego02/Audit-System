import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import Chart from 'chart.js/auto';

const AdminAnalyticsDashboard = () => {
  const { user, isAdmin, authLoading } = useAuth();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('all');
  const [dataType, setDataType] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Refs for Chart.js canvases
  const overallRiskChartRef = useRef(null);
  const vulnerabilityRiskChartRef = useRef(null);
  const auditRiskChartRef = useRef(null);
  const topVulnerabilitiesChartRef = useRef(null);
  const topRiskQuestionsChartRef = useRef(null);
  const reviewStatsChartRef = useRef(null);
  const conversionStatsChartRef = useRef(null);
  const adminVsSystemChartRef = useRef(null);
  const categoryStatsChartRef = useRef(null);

  // Refs to store Chart.js instances for cleanup
  const chartInstances = useRef({});

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
      return;
    }

    if (!authLoading && user && isAdmin) {
      fetchAnalytics();
    }
  }, [user, isAdmin, authLoading, navigate, timeRange, dataType, customStartDate, customEndDate]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = { timeRange, type: dataType };
      if (timeRange === 'custom' && customStartDate && customEndDate) {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }

      const response = await api.get('/analytics', { params });
      setAnalyticsData(response.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(
        err.response?.status === 403
          ? 'Access denied. You do not have permission to view analytics.'
          : err.response?.status === 401
          ? 'Authentication failed. Please log in again.'
          : err.response?.data?.message || 'Failed to fetch analytics data. Please try again later.'
      );
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      }
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

  // Chart.js configuration for pie charts
  const createPieChart = (canvasRef, data, labels, colors, title, chartId) => {
    if (canvasRef.current) {
      // Destroy existing chart instance if it exists
      if (chartInstances.current[chartId]) {
        chartInstances.current[chartId].destroy();
      }

      chartInstances.current[chartId] = new Chart(canvasRef.current, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { size: 12 }, color: '#333' }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { size: 12 },
              bodyFont: { size: 12 }
            },
            title: {
              display: true,
              text: title,
              font: { size: 16, weight: 'bold' },
              color: '#333'
            }
          },
          animation: {
            animateScale: true,
            animateRotate: true
          }
        }
      });
    }
  };

  // Chart.js configuration for bar charts
  const createBarChart = (canvasRef, data, labelKey, valueKey, color, title, chartId) => {
    if (canvasRef.current) {
      // Destroy existing chart instance if it exists
      if (chartInstances.current[chartId]) {
        chartInstances.current[chartId].destroy();
      }

      // Function to truncate long labels
      const truncateLabel = (label, maxLength = 30) => {
        return label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
      };
      
      chartInstances.current[chartId] = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: data.map(item => truncateLabel(item[labelKey], 40)),
          datasets: [{
            label: 'Count',
            data: data.map(item => item[valueKey]),
            backgroundColor: color,
            borderWidth: 1,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y', // Horizontal bars
          plugins: {
            legend: { display: false },
            tooltip: { 
              backgroundColor: 'rgba(0,0,0,0.8)', 
              titleFont: { size: 12 }, 
              bodyFont: { size: 12 },
              callbacks: {
                title: function(context) {
                  const fullLabel = data[context[0].dataIndex][labelKey];
                  return fullLabel;
                }
              }
            },
            title: { 
              display: true, 
              text: title, 
              font: { size: 16, weight: 'bold' }, 
              color: '#333' 
            }
          },
          scales: {
            x: { 
              beginAtZero: true,
              ticks: { font: { size: 12 }, color: '#333' }
            },
            y: { 
              ticks: { 
                font: { size: 11 }, 
                color: '#333',
                maxRotation: 0
              } 
            }
          },
          layout: {
            padding: { left: 10, right: 10, top: 10, bottom: 10 }
          }
        }
      });
    }
  };

  // Chart.js configuration for doughnut charts
  const createDoughnutChart = (canvasRef, data, labels, colors, title, chartId) => {
    if (canvasRef.current) {
      if (chartInstances.current[chartId]) {
        chartInstances.current[chartId].destroy();
      }

      chartInstances.current[chartId] = new Chart(canvasRef.current, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { size: 12 }, color: '#333' }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { size: 12 },
              bodyFont: { size: 12 }
            },
            title: {
              display: true,
              text: title,
              font: { size: 16, weight: 'bold' },
              color: '#333'
            }
          },
          animation: {
            animateScale: true,
            animateRotate: true
          }
        }
      });
    }
  };

  // Chart.js configuration for multi-dataset bar charts
  const createMultiBarChart = (canvasRef, data, datasets, title, chartId) => {
    if (canvasRef.current) {
      if (chartInstances.current[chartId]) {
        chartInstances.current[chartId].destroy();
      }

      chartInstances.current[chartId] = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: data,
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { size: 12 }, color: '#333' }
            },
            tooltip: {
              backgroundColor: 'rgba(0,0,0,0.8)',
              titleFont: { size: 12 },
              bodyFont: { size: 12 }
            },
            title: {
              display: true,
              text: title,
              font: { size: 16, weight: 'bold' },
              color: '#333'
            }
          },
          scales: {
            x: {
              ticks: { font: { size: 12 }, color: '#333' }
            },
            y: {
              beginAtZero: true,
              ticks: { font: { size: 12 }, color: '#333' }
            }
          }
        }
      });
    }
  };

  // Initialize charts when analyticsData changes
  useEffect(() => {
    if (analyticsData) {
      if (analyticsData.type === 'combined') {
        // Overall risk distribution combining both types
        const vulnData = analyticsData.vulnerability;
        const auditData = analyticsData.audit;
        
        const overallHigh = (vulnData.riskDistribution?.high || 0) + (auditData.riskDistribution?.high || 0);
        const overallMedium = (vulnData.riskDistribution?.medium || 0) + (auditData.riskDistribution?.medium || 0);
        const overallLow = (vulnData.riskDistribution?.low || 0) + (auditData.riskDistribution?.low || 0);

        createPieChart(
          overallRiskChartRef,
          [overallHigh, overallMedium, overallLow],
          ['High Risk', 'Medium Risk', 'Low Risk'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Overall Risk Distribution',
          'overallRiskChart'
        );

        // Individual risk distributions
        createPieChart(
          vulnerabilityRiskChartRef,
          [vulnData.riskDistribution?.high || 0, vulnData.riskDistribution?.medium || 0, vulnData.riskDistribution?.low || 0],
          ['High', 'Medium', 'Low'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Vulnerability Risk Distribution',
          'vulnerabilityRiskChart'
        );

        createPieChart(
          auditRiskChartRef,
          [auditData.riskDistribution?.high || 0, auditData.riskDistribution?.medium || 0, auditData.riskDistribution?.low || 0],
          ['High', 'Medium', 'Low'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Audit Risk Distribution',
          'auditRiskChart'
        );

        // Top vulnerabilities
        if (vulnData.commonVulnerabilities && vulnData.commonVulnerabilities.length > 0) {
          createBarChart(
            topVulnerabilitiesChartRef,
            vulnData.commonVulnerabilities.slice(0, 5),
            'category',
            'count',
            '#dc3545',
            'Top 5 Vulnerability Categories',
            'topVulnerabilitiesChart'
          );
        }

        // Top risk questions
        if (auditData.commonHighRisks && auditData.commonHighRisks.length > 0) {
          createBarChart(
            topRiskQuestionsChartRef,
            auditData.commonHighRisks.slice(0, 5),
            'question',
            'count',
            '#ffc107',
            'Top 5 High-Risk Questions',
            'topRiskQuestionsChart'
          );
        }


        // Review statistics
        if (auditData.reviewStats) {
          createDoughnutChart(
            reviewStatsChartRef,
            [auditData.reviewStats.completed, auditData.reviewStats.under_review, auditData.reviewStats.pending_review],
            ['Completed', 'Under Review', 'Pending Review'],
            ['#28a745', '#ffc107', '#dc3545'],
            'Audit Review Status',
            'reviewStatsChart'
          );
        }

        // Conversion statistics
        if (analyticsData.conversionStats) {
          createDoughnutChart(
            conversionStatsChartRef,
            [analyticsData.conversionStats.audits_with_vulnerabilities, analyticsData.conversionStats.total_audits - analyticsData.conversionStats.audits_with_vulnerabilities],
            ['Generated Vulnerabilities', 'No Vulnerabilities'],
            ['#dc3545', '#6c757d'],
            'Audit to Vulnerability Conversion',
            'conversionStatsChart'
          );
        }

        // Admin vs System Risk Comparison
        if (auditData.adminVsSystemRisk) {
          const adminData = auditData.adminVsSystemRisk;
          createMultiBarChart(
            adminVsSystemChartRef,
            ['High', 'Medium', 'Low'],
            [
              {
                label: 'System Risk',
                data: [
                  adminData.system_risk_distribution.high,
                  adminData.system_risk_distribution.medium,
                  adminData.system_risk_distribution.low
                ],
                backgroundColor: '#17a2b8'
              },
              {
                label: 'Admin Risk',
                data: [
                  adminData.admin_risk_distribution.high,
                  adminData.admin_risk_distribution.medium,
                  adminData.admin_risk_distribution.low
                ],
                backgroundColor: '#6f42c1'
              }
            ],
            'System vs Admin Risk Assessment',
            'adminVsSystemChart'
          );
        }

        // Question Category Statistics
        if (auditData.questionCategoryStats && auditData.questionCategoryStats.length > 0) {
          createBarChart(
            categoryStatsChartRef,
            auditData.questionCategoryStats.slice(0, 8),
            'category',
            'high_risk_count',
            '#ffc107',
            'High-Risk Issues by Category',
            'categoryStatsChart'
          );
        }
      } else if (analyticsData.type === 'vulnerability') {
        createPieChart(
          vulnerabilityRiskChartRef,
          [analyticsData.riskDistribution?.high || 0, analyticsData.riskDistribution?.medium || 0, analyticsData.riskDistribution?.low || 0],
          ['High', 'Medium', 'Low'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Vulnerability Risk Distribution',
          'vulnerabilityRiskChart'
        );

        if (analyticsData.commonVulnerabilities && analyticsData.commonVulnerabilities.length > 0) {
          createBarChart(
            topVulnerabilitiesChartRef,
            analyticsData.commonVulnerabilities.slice(0, 5),
            'category',
            'count',
            '#dc3545',
            'Top 5 Vulnerability Categories',
            'topVulnerabilitiesChart'
          );
        }
      } else if (analyticsData.type === 'audit') {
        createPieChart(
          auditRiskChartRef,
          [analyticsData.riskDistribution?.high || 0, analyticsData.riskDistribution?.medium || 0, analyticsData.riskDistribution?.low || 0],
          ['High', 'Medium', 'Low'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Audit Risk Distribution',
          'auditRiskChart'
        );

        if (analyticsData.commonHighRisks && analyticsData.commonHighRisks.length > 0) {
          createBarChart(
            topRiskQuestionsChartRef,
            analyticsData.commonHighRisks.slice(0, 5),
            'question',
            'count',
            '#ffc107',
            'Top 5 High-Risk Questions',
            'topRiskQuestionsChart'
          );
        }
      }

      // Cleanup function to destroy all charts on unmount
      return () => {
        Object.values(chartInstances.current).forEach(chart => {
          if (chart) chart.destroy();
        });
        chartInstances.current = {};
      };
    }
  }, [analyticsData]);

  if (loading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <h5 className="text-dark fw-bold">Loading Analytics Dashboard</h5>
          <p className="text-muted">Fetching your security insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm border-0 rounded-3 p-4" style={{ maxWidth: '500px' }}>
          <div className="card-body text-center">
            <i className="bi bi-exclamation-circle-fill text-danger display-4 mb-3"></i>
            <h5 className="card-title text-danger fw-bold mb-3">Error Loading Data</h5>
            <p className="text-muted mb-4">{error}</p>
            <button className="btn btn-primary" onClick={fetchAnalytics}>
              <i className="bi bi-arrow-repeat me-2"></i>Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderStatCard = (title, value, icon, color, subtitle) => (
    <div className="col-xl-3 col-md-6 mb-4">
      <div className="card h-100 border-0 shadow-sm">
        <div className="card-body d-flex align-items-center">
          <div className={`bg-${color} bg-opacity-10 rounded-3 p-3 me-3`}>
            <i className={`bi ${icon} fs-4 text-${color}`}></i>
          </div>
          <div>
            <h6 className="text-muted mb-1">{title}</h6>
            <h4 className="fw-bold mb-1">{value}</h4>
            {subtitle && <small className="text-muted">{subtitle}</small>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderKeyMetrics = (data) => {
    if (data.type === 'combined') {
      const vulnData = data.vulnerability;
      const auditData = data.audit;
      const totalHigh = (vulnData.riskDistribution?.high || 0) + (auditData.riskDistribution?.high || 0);
      const totalMedium = (vulnData.riskDistribution?.medium || 0) + (auditData.riskDistribution?.medium || 0);
      const totalLow = (vulnData.riskDistribution?.low || 0) + (auditData.riskDistribution?.low || 0);
      const totalItems = totalHigh + totalMedium + totalLow;

      return (
        <div className="row mb-4">
          {renderStatCard('Total Items', totalItems, 'bi-bar-chart-fill', 'primary', 'All submissions')}
          {renderStatCard('High Risk', totalHigh, 'bi-exclamation-triangle-fill', 'danger', `${totalItems > 0 ? Math.round((totalHigh / totalItems) * 100) : 0}% of total`)}
          {renderStatCard('Total Vulnerabilities', vulnData.resolutionStats?.total_vulnerabilities || 0, 'bi-bug-fill', 'danger', 'All vulnerabilities')}
          {renderStatCard('Audit Conversion', data.conversionStats?.conversion_rate || 0, 'bi-arrow-right-circle-fill', 'info', `${data.conversionStats?.audits_with_vulnerabilities || 0}/${data.conversionStats?.total_audits || 0} audits`)}
        </div>
      );
    } else if (data.type === 'vulnerability') {
      const totalItems = (data.riskDistribution?.high || 0) + (data.riskDistribution?.medium || 0) + (data.riskDistribution?.low || 0);
      return (
        <div className="row mb-4">
          {renderStatCard('Total Submissions', data.totalSubmissions, 'bi-bar-chart-fill', 'primary', '')}
          {renderStatCard('High Risk', data.riskDistribution?.high || 0, 'bi-exclamation-triangle-fill', 'danger', `${totalItems > 0 ? Math.round(((data.riskDistribution?.high || 0) / totalItems) * 100) : 0}% of total`)}
          {renderStatCard('Total Vulnerabilities', data.resolutionStats?.total_vulnerabilities || 0, 'bi-bug-fill', 'danger', 'All vulnerabilities')}
        </div>
      );
    } else {
      const totalItems = (data.riskDistribution?.high || 0) + (data.riskDistribution?.medium || 0) + (data.riskDistribution?.low || 0);
      return (
        <div className="row mb-4">
          {renderStatCard('Total Submissions', data.totalSubmissions, 'bi-bar-chart-fill', 'primary', '')}
          {renderStatCard('High Risk', data.riskDistribution?.high || 0, 'bi-exclamation-triangle-fill', 'danger', `${totalItems > 0 ? Math.round(((data.riskDistribution?.high || 0) / totalItems) * 100) : 0}% of total`)}
          {renderStatCard('Completion Rate', data.reviewStats?.completion_rate || 0, 'bi-check-circle-fill', 'success', `${data.reviewStats?.completed || 0}/${data.reviewStats?.total_submissions || 0} completed`)}
        </div>
      );
    }
  };

  const renderRiskDistribution = (data) => {
    if (data.type === 'combined') {
      return (
        <div className="row mb-4">
          <div className="col-lg-4 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-pie-chart-fill text-primary me-2"></i>Overall Risk Distribution</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <canvas ref={overallRiskChartRef} aria-label="Overall Risk Distribution"></canvas>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-bug-fill text-danger me-2"></i>Vulnerabilities</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <canvas ref={vulnerabilityRiskChartRef} aria-label="Vulnerability Risk Distribution"></canvas>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-clipboard-check text-info me-2"></i>Audits</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <canvas ref={auditRiskChartRef} aria-label="Audit Risk Distribution"></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    } else {
      const chartRef = data.type === 'vulnerability' ? vulnerabilityRiskChartRef : auditRiskChartRef;
      const icon = data.type === 'vulnerability' ? 'bi-bug-fill' : 'bi-clipboard-check';
      const color = data.type === 'vulnerability' ? 'danger' : 'info';
      const title = data.type === 'vulnerability' ? 'Vulnerability Risk Distribution' : 'Audit Risk Distribution';

      return (
        <div className="row mb-4">
          <div className="col-lg-6 mx-auto mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className={`bi ${icon} text-${color} me-2`}></i>{title}</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <canvas ref={chartRef} aria-label={title}></canvas>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const renderTopIssues = (data) => {
    const hasVulnerabilities = data.type === 'combined' ? data.vulnerability.commonVulnerabilities?.length > 0 : data.type === 'vulnerability' && data.commonVulnerabilities?.length > 0;
    const hasRiskQuestions = data.type === 'combined' ? data.audit.commonHighRisks?.length > 0 : data.type === 'audit' && data.commonHighRisks?.length > 0;

    if (!hasVulnerabilities && !hasRiskQuestions) {
      return null;
    }

    return (
      <div className="row mb-4">
        {hasVulnerabilities && (
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-list-ul text-danger me-2"></i>Top Vulnerability Categories</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '400px' }}>
                  <canvas ref={topVulnerabilitiesChartRef} aria-label="Top Vulnerability Categories"></canvas>
                </div>
              </div>
            </div>
          </div>
        )}
        {hasRiskQuestions && (
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-question-circle-fill text-warning me-2"></i>Top High-Risk Questions</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '400px' }}>
                  <canvas ref={topRiskQuestionsChartRef} aria-label="Top High-Risk Questions"></canvas>
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    Hover over bars for full question text
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderProcessInsights = (data) => {
    if (data.type !== 'combined') return null;

    const vulnData = data.vulnerability;
    const auditData = data.audit;

    return (
      <div className="row mb-4">
        {/* Review Statistics */}
        {auditData.reviewStats && (
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-clipboard-check text-info me-2"></i>Review Status</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <canvas ref={reviewStatsChartRef} aria-label="Audit Review Status"></canvas>
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    Completion Rate: {auditData.reviewStats.completion_rate}%
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conversion Statistics */}
        {data.conversionStats && (
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-arrow-right-circle-fill text-primary me-2"></i>Audit Conversion</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <canvas ref={conversionStatsChartRef} aria-label="Audit to Vulnerability Conversion"></canvas>
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    Conversion Rate: {data.conversionStats.conversion_rate}%<br/>
                    {data.conversionStats.total_vulnerabilities_created} vulnerabilities created
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAdvancedAnalytics = (data) => {
    if (data.type !== 'combined') return null;

    const auditData = data.audit;

    return (
      <div className="row mb-4">
        {/* Admin vs System Risk Comparison */}
        {auditData.adminVsSystemRisk && (
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-balance-scale text-purple me-2"></i>Risk Assessment Comparison</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '400px' }}>
                  <canvas ref={adminVsSystemChartRef} aria-label="System vs Admin Risk Assessment"></canvas>
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    Admin Overrides: {auditData.adminVsSystemRisk.admin_overrides} submissions
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Category Statistics */}
        {auditData.questionCategoryStats && auditData.questionCategoryStats.length > 0 && (
          <div className="col-lg-6 mb-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white">
                <h6 className="fw-bold mb-0"><i className="bi bi-tags-fill text-warning me-2"></i>High-Risk by Category</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '400px' }}>
                  <canvas ref={categoryStatsChartRef} aria-label="High-Risk Issues by Category"></canvas>
                </div>
                <div className="mt-2">
                  <small className="text-muted">
                    Top categories with highest risk issues
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-vh-100 bg-light">
      <header className="bg-white shadow-sm py-3 mb-4">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="h3 fw-bold mb-1">Security Analytics Dashboard</h1>
              <p className="text-muted mb-0">Risk assessment insights and security metrics</p>
            </div>
            <div className="col-md-6 text-end">
              <button
                className="btn btn-primary"
                onClick={fetchAnalytics}
                disabled={loading}
                aria-label="Refresh analytics data"
              >
                <i className={`bi ${loading ? 'bi-arrow-repeat spin' : 'bi-arrow-repeat'} me-2`}></i>
                {loading ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container-fluid">
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-header bg-white">
            <h6 className="fw-bold mb-0"><i className="bi bi-filter text-primary me-2"></i>Filters</h6>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label htmlFor="dataType" className="form-label fw-semibold text-muted">
                  Data Type
                </label>
                <select
                  id="dataType"
                  className="form-select"
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  aria-label="Select data type"
                >
                  <option value="combined">Combined Analytics</option>
                  <option value="vulnerability">Vulnerabilities Only</option>
                  <option value="audit">Audits Only</option>
                </select>
              </div>
              <div className="col-md-3">
                <label htmlFor="timeRange" className="form-label fw-semibold text-muted">
                  Time Range
                </label>
                <select
                  id="timeRange"
                  className="form-select"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  aria-label="Select time range"
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
                    <label htmlFor="startDate" className="form-label fw-semibold text-muted">
                      Start Date
                    </label>
                    <input
                      id="startDate"
                      type="date"
                      className="form-control"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      aria-label="Select start date"
                    />
                  </div>
                  <div className="col-md-2">
                    <label htmlFor="endDate" className="form-label fw-semibold text-muted">
                      End Date
                    </label>
                    <input
                      id="endDate"
                      type="date"
                      className="form-control"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      aria-label="Select end date"
                    />
                  </div>
                  <div className="col-md-2 d-flex align-items-end">
                    <button
                      className="btn btn-success w-100"
                      onClick={handleCustomDateSubmit}
                      disabled={!customStartDate || !customEndDate}
                      aria-label="Apply custom date range"
                    >
                      <i className="bi bi-check2 me-2"></i>Apply
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {analyticsData && (
          <div className="analytics-content">
            {/* Key Metrics */}
            {renderKeyMetrics(analyticsData)}
            
            {/* Risk Distribution */}
            {renderRiskDistribution(analyticsData)}
            
            {/* Process Insights - Only for combined view */}
            {renderProcessInsights(analyticsData)}
            
            {/* Top Issues */}
            {renderTopIssues(analyticsData)}
            
            {/* Advanced Analytics - Only for combined view */}
            {renderAdvancedAnalytics(analyticsData)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;