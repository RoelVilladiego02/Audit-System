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
  const [timeRange, setTimeRange] = useState('week');
  const [dataType, setDataType] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Refs for Chart.js canvases
  const vulnRiskChartRef = useRef(null);
  const vulnSeverityChartRef = useRef(null);
  const vulnTrendsChartRef = useRef(null);
  const vulnCommonChartRef = useRef(null);
  const auditRiskChartRef = useRef(null);
  const auditProportionChartRef = useRef(null);
  const auditAnswerRiskChartRef = useRef(null);
  const auditTrendsChartRef = useRef(null);
  const auditHighRiskChartRef = useRef(null);
  const combinedRiskChartRef = useRef(null);
  const combinedTrendsChartRef = useRef(null);

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
            borderWidth: 1,
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

  // Chart.js configuration for line charts
  const createLineChart = (canvasRef, data, label, color, title, chartId) => {
    if (canvasRef.current) {
      // Destroy existing chart instance if it exists
      if (chartInstances.current[chartId]) {
        chartInstances.current[chartId].destroy();
      }

      chartInstances.current[chartId] = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: data.map(item => item.date),
          datasets: [{
            label: label,
            data: data.map(item => item.count),
            borderColor: color,
            backgroundColor: `${color}33`, // 20% opacity
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: color
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 12 }, color: '#333' } },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: 12 }, bodyFont: { size: 12 } },
            title: { display: true, text: title, font: { size: 16, weight: 'bold' }, color: '#333' }
          },
          scales: {
            x: { ticks: { font: { size: 12 }, color: '#333' } },
            y: { beginAtZero: true, ticks: { font: { size: 12 }, color: '#333' } }
          }
        }
      });
    }
  };

  // Chart.js configuration for multi-line charts (for combined trends)
  const createMultiLineChart = (canvasRef, data, labels, colors, title, chartId) => {
    if (canvasRef.current) {
      // Destroy existing chart instance if it exists
      if (chartInstances.current[chartId]) {
        chartInstances.current[chartId].destroy();
      }

      // Prepare datasets for multiple lines
      const datasets = labels.map((label, index) => ({
        label: label,
        data: data.map(item => index === 0 ? item.count : item.audits),
        borderColor: colors[index],
        backgroundColor: `${colors[index]}33`, // 20% opacity
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: colors[index]
      }));

      chartInstances.current[chartId] = new Chart(canvasRef.current, {
        type: 'line',
        data: {
          labels: data.map(item => item.date),
          datasets: datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 12 }, color: '#333' } },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.8)', titleFont: { size: 12 }, bodyFont: { size: 12 } },
            title: { display: true, text: title, font: { size: 16, weight: 'bold' }, color: '#333' }
          },
          scales: {
            x: { ticks: { font: { size: 12 }, color: '#333' } },
            y: { beginAtZero: true, ticks: { font: { size: 12 }, color: '#333' } }
          }
        }
      });
    }
  };

  // Updated Chart.js configuration for bar charts with better text handling
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

      // Special handling for high-risk questions chart
      const isHighRiskChart = chartId === 'auditHighRiskChart';
      
      chartInstances.current[chartId] = new Chart(canvasRef.current, {
        type: 'bar',
        data: {
          labels: data.map(item => isHighRiskChart ? truncateLabel(item[labelKey], 40) : item[labelKey]),
          datasets: valueKey instanceof Array ? valueKey.map((key, index) => ({
            label: ['High', 'Medium', 'Low'][index],
            data: data.map(item => item[key]),
            backgroundColor: color[index]
          })) : [{
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
          indexAxis: isHighRiskChart ? 'y' : 'x', // Horizontal bars for high-risk questions
          plugins: {
            legend: { 
              display: valueKey instanceof Array, 
              position: 'bottom', 
              labels: { font: { size: 12 }, color: '#333' } 
            },
            tooltip: { 
              backgroundColor: 'rgba(0,0,0,0.8)', 
              titleFont: { size: 12 }, 
              bodyFont: { size: 12 },
              // Show full text in tooltip for truncated labels
              callbacks: isHighRiskChart ? {
                title: function(context) {
                  const fullLabel = data[context[0].dataIndex][labelKey];
                  return fullLabel;
                }
              } : undefined
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
              ticks: { 
                font: { size: isHighRiskChart ? 11 : 12 }, 
                color: '#333',
                maxRotation: isHighRiskChart ? 0 : 45,
                minRotation: isHighRiskChart ? 0 : 0
              } 
            },
            y: { 
              beginAtZero: isHighRiskChart ? false : true, 
              ticks: { 
                font: { size: 11 }, 
                color: '#333',
                maxRotation: 0,
                callback: function(value, index) {
                  if (isHighRiskChart && typeof this.getLabelForValue(value) === 'string') {
                    const label = this.getLabelForValue(value);
                    return label.length > 25 ? label.substring(0, 25) + '...' : label;
                  }
                  return this.getLabelForValue(value);
                }
              } 
            }
          },
          layout: {
            padding: {
              left: isHighRiskChart ? 10 : 0,
              right: 10,
              top: 10,
              bottom: isHighRiskChart ? 10 : 20
            }
          }
        }
      });
    }
  };

  // Initialize charts when analyticsData changes
  useEffect(() => {
    if (analyticsData) {
      if (analyticsData.type === 'vulnerability' || analyticsData.type === 'combined') {
        const vulnData = analyticsData.type === 'combined' ? analyticsData.vulnerability : analyticsData;
        createPieChart(
          vulnRiskChartRef,
          [vulnData.riskDistribution?.high || 0, vulnData.riskDistribution?.medium || 0, vulnData.riskDistribution?.low || 0],
          ['High', 'Medium', 'Low'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Risk Level Distribution',
          'vulnRiskChart'
        );
        createPieChart(
          vulnSeverityChartRef,
          [vulnData.severityDistribution?.high || 0, vulnData.severityDistribution?.medium || 0, vulnData.severityDistribution?.low || 0],
          ['High', 'Medium', 'Low'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Severity Distribution',
          'vulnSeverityChart'
        );
        createLineChart(
          vulnTrendsChartRef,
          vulnData.submissionTrends || [],
          'Vulnerabilities',
          '#007bff',
          'Submission Trends',
          'vulnTrendsChart'
        );
        createBarChart(
          vulnCommonChartRef,
          vulnData.commonVulnerabilities || [],
          'category',
          'count',
          '#007bff',
          'Common Vulnerabilities',
          'vulnCommonChart'
        );
      }
      if (analyticsData.type === 'audit' || analyticsData.type === 'combined') {
        const auditData = analyticsData.type === 'combined' ? analyticsData.audit : analyticsData;
        createPieChart(
          auditRiskChartRef,
          [auditData.riskDistribution?.high || 0, auditData.riskDistribution?.medium || 0, auditData.riskDistribution?.low || 0],
          ['High', 'Medium', 'Low'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Submission Risk Distribution',
          'auditRiskChart'
        );
        createPieChart(
          auditProportionChartRef,
          [auditData.riskProportion?.high || 0, auditData.riskProportion?.medium || 0, auditData.riskProportion?.low || 0],
          ['High (%)', 'Medium (%)', 'Low (%)'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Risk Proportion',
          'auditProportionChart'
        );
        createPieChart(
          auditAnswerRiskChartRef,
          [auditData.answerRiskDistribution?.high || 0, auditData.answerRiskDistribution?.medium || 0, auditData.answerRiskDistribution?.low || 0],
          ['High (%)', 'Medium (%)', 'Low (%)'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Answer Risk Distribution',
          'auditAnswerRiskChart'
        );
        createLineChart(
          auditTrendsChartRef,
          auditData.submissionTrends || [],
          'Audits',
          '#17a2b8',
          'Submission Trends',
          'auditTrendsChart'
        );
        createBarChart(
          auditHighRiskChartRef,
          auditData.commonHighRisks || [],
          'question',
          'count',
          '#dc3545',
          'Common High-Risk Questions',
          'auditHighRiskChart'
        );
      }
      if (analyticsData.type === 'combined') {
        createBarChart(
          combinedRiskChartRef,
          [
            {
              category: 'Vulnerabilities',
              high: analyticsData.vulnerability.riskDistribution?.high || 0,
              medium: analyticsData.vulnerability.riskDistribution?.medium || 0,
              low: analyticsData.vulnerability.riskDistribution?.low || 0
            },
            {
              category: 'Audits',
              high: analyticsData.audit.riskDistribution?.high || 0,
              medium: analyticsData.audit.riskDistribution?.medium || 0,
              low: analyticsData.audit.riskDistribution?.low || 0
            }
          ],
          'category',
          ['high', 'medium', 'low'],
          ['#dc3545', '#ffc107', '#28a745'],
          'Risk Distribution Comparison',
          'combinedRiskChart'
        );
        
        // Merge and align dates for combined trends
        const vulnTrends = analyticsData.vulnerability.submissionTrends || [];
        const auditTrends = analyticsData.audit.submissionTrends || [];
        const allDates = [...new Set([...vulnTrends.map(t => t.date), ...auditTrends.map(t => t.date)])].sort();

        const combinedTrendsData = allDates.map(date => {
          const vulnItem = vulnTrends.find(t => t.date === date);
          const auditItem = auditTrends.find(t => t.date === date);
          return {
            date: date,
            count: vulnItem ? vulnItem.count : 0, // Vulnerabilities count
            audits: auditItem ? auditItem.count : 0 // Audits count
          };
        });

        createMultiLineChart(
          combinedTrendsChartRef,
          combinedTrendsData,
          ['Vulnerabilities', 'Audits'],
          ['#007bff', '#17a2b8'],
          'Submission Trends Comparison',
          'combinedTrendsChart'
        );
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

  // Updated renderVulnerabilityAnalytics function (removed Assignment Rate)
  const renderVulnerabilityAnalytics = (data) => (
    <div className="accordion" id="vulnerabilityAccordion">
      <div className="accordion-item border-0 shadow-sm">
        <h2 className="accordion-header">
          <button
            className="accordion-button"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#vulnerabilityCollapse"
            aria-expanded="true"
            aria-controls="vulnerabilityCollapse"
          >
            <i className="bi bi-bug-fill text-primary me-2"></i> Vulnerability Analytics
          </button>
        </h2>
        <div id="vulnerabilityCollapse" className="accordion-collapse collapse show" data-bs-parent="#vulnerabilityAccordion">
          <div className="accordion-body">
            <div className="row mb-4">
              {renderStatCard('Total Submissions', data.totalSubmissions, 'bi-bug-fill', 'primary', '')}
              {renderStatCard('Average Risk Score', data.averageRiskScore, 'bi-speedometer2', 'info', '')}
              {renderStatCard('Unassigned', data.assignmentStats?.unassigned || 0, 'bi-clock-fill', 'warning', '')}
            </div>
            <div className="row">
              <div className="col-lg-6 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>Risk Level Distribution</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <canvas ref={vulnRiskChartRef} aria-label="Vulnerability Risk Level Distribution"></canvas>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-bar-chart-fill text-info me-2"></i>Severity Distribution</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <canvas ref={vulnSeverityChartRef} aria-label="Vulnerability Severity Distribution"></canvas>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-graph-up text-primary me-2"></i>Submission Trends</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <canvas ref={vulnTrendsChartRef} aria-label="Vulnerability Submission Trends"></canvas>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-list-ul text-danger me-2"></i>Common Vulnerabilities</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <canvas ref={vulnCommonChartRef} aria-label="Common Vulnerabilities"></canvas>
                    </div>
                    <small className="text-muted">
                      Top 5 Categories: {data.commonVulnerabilities?.slice(0, 5).map(v => v.category).join(', ') || 'None'}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Updated renderAuditAnalytics function with better chart container
  const renderAuditAnalytics = (data) => (
    <div className="accordion" id="auditAccordion">
      <div className="accordion-item border-0 shadow-sm">
        <h2 className="accordion-header">
          <button
            className="accordion-button"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#auditCollapse"
            aria-expanded="true"
            aria-controls="auditCollapse"
          >
            <i className="bi bi-clipboard-check text-info me-2"></i> Audit Analytics
          </button>
        </h2>
        <div id="auditCollapse" className="accordion-collapse collapse show" data-bs-parent="#auditAccordion">
          <div className="accordion-body">
            <div className="row mb-4">
              {renderStatCard('Total Submissions', data.totalSubmissions, 'bi-clipboard-check', 'info', '')}
              {renderStatCard('Average Risk Score', data.averageRiskScore, 'bi-speedometer2', 'primary', '')}
              {renderStatCard('High Risk Audits', data.riskDistribution?.high || 0, 'bi-exclamation-triangle-fill', 'danger', '')}
              {renderStatCard('Total Answers', data.answerRiskDistribution?.total_answers || 0, 'bi-question-circle-fill', 'success', '')}
            </div>
            <div className="row">
              <div className="col-lg-4 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>Submission Risk Distribution</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <canvas ref={auditRiskChartRef} aria-label="Audit Submission Risk Distribution"></canvas>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-4 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-percent text-info me-2"></i>Risk Proportion (%)</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <canvas ref={auditProportionChartRef} aria-label="Audit Risk Proportion"></canvas>
                    </div>
                    <small className="text-muted">Total Submissions: {data.riskProportion?.total_submissions || 0}</small>
                  </div>
                </div>
              </div>
              <div className="col-lg-4 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-pie-chart-fill text-success me-2"></i>Answer Risk Distribution</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <canvas ref={auditAnswerRiskChartRef} aria-label="Audit Answer Risk Distribution"></canvas>
                    </div>
                    <small className="text-muted">Total Answers: {data.answerRiskDistribution?.total_answers || 0}</small>
                  </div>
                </div>
              </div>
              <div className="col-lg-6 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-graph-up text-primary me-2"></i>Submission Trends</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ height: '300px' }}>
                      <canvas ref={auditTrendsChartRef} aria-label="Audit Submission Trends"></canvas>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-6 mb-4">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white">
                    <h6 className="fw-bold mb-0"><i className="bi bi-question-circle-fill text-danger me-2"></i>Common High-Risk Questions</h6>
                  </div>
                  <div className="card-body">
                    {/* Increased height and better container for horizontal chart */}
                    <div style={{ height: '500px', width: '100%' }}>
                      <canvas ref={auditHighRiskChartRef} aria-label="Common High-Risk Questions"></canvas>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted">
                        Hover over bars for full question text
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCombinedAnalytics = (data) => (
    <div>
      <div className="row mb-4">
        {renderStatCard('Total Submissions', data.summary.totalSubmissions, 'bi-bar-chart-fill', 'primary', '')}
        {renderStatCard('Vulnerability Submissions', data.summary.vulnerabilitySubmissions, 'bi-bug-fill', 'danger', '')}
        {renderStatCard('Audit Submissions', data.summary.auditSubmissions, 'bi-clipboard-check', 'info', '')}
        {renderStatCard(
          'High Risk Items',
          (data.vulnerability.riskDistribution?.high || 0) + (data.audit.riskDistribution?.high || 0),
          'bi-exclamation-triangle-fill',
          'danger',
          ''
        )}
      </div>
      <div className="row mb-4">
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h6 className="fw-bold mb-0"><i className="bi bi-balance-scale text-info me-2"></i>Risk Distribution Comparison</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <canvas ref={combinedRiskChartRef} aria-label="Risk Distribution Comparison"></canvas>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white">
              <h6 className="fw-bold mb-0"><i className="bi bi-graph-up-arrow text-success me-2"></i>Submission Trends Comparison</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <canvas ref={combinedTrendsChartRef} aria-label="Submission Trends Comparison"></canvas>
              </div>
            </div>
          </div>
        </div>
      </div>
      {renderVulnerabilityAnalytics(data.vulnerability)}
      {renderAuditAnalytics(data.audit)}
    </div>
  );

  return (
    <div className="min-vh-100 bg-light">
      <header className="bg-white shadow-sm py-3 mb-4">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="h3 fw-bold mb-1">Analytics Dashboard</h1>
              <p className="text-muted mb-0">Comprehensive security insights and metrics</p>
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
            {analyticsData.type === 'vulnerability' && renderVulnerabilityAnalytics(analyticsData)}
            {analyticsData.type === 'audit' && renderAuditAnalytics(analyticsData)}
            {analyticsData.type === 'combined' && renderCombinedAnalytics(analyticsData)}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalyticsDashboard;