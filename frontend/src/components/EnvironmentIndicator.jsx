import React from 'react';
import { ENV, DEBUG, API_URL, isDevelopment, isProduction } from '../config/environment';

const EnvironmentIndicator = () => {
  // Only show in development or when debug is enabled
  if (!DEBUG && !isDevelopment()) {
    return null;
  }

  const getEnvironmentColor = () => {
    if (isDevelopment()) return 'bg-success';
    if (isProduction()) return 'bg-danger';
    return 'bg-warning';
  };

  const getEnvironmentIcon = () => {
    if (isDevelopment()) return 'bi-code-slash';
    if (isProduction()) return 'bi-rocket';
    return 'bi-gear';
  };

  return (
    <div 
      className={`position-fixed ${getEnvironmentColor()} text-white px-2 py-1 rounded-end shadow-sm`}
      style={{
        top: '10px',
        left: '0',
        zIndex: 9999,
        fontSize: '0.75rem',
        fontFamily: 'monospace'
      }}
      title={`Environment: ${ENV}\nAPI: ${API_URL}\nDebug: ${DEBUG ? 'ON' : 'OFF'}`}
    >
      <i className={`bi ${getEnvironmentIcon()} me-1`}></i>
      {ENV.toUpperCase()}
    </div>
  );
};

export default EnvironmentIndicator;
