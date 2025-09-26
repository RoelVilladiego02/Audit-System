// Environment Configuration
// This file helps switch between development and production settings

const config = {
  development: {
    API_URL: 'http://localhost:8000/api', // Default for local development
    BASE_URL: 'http://localhost:8000',
    CORS_ORIGIN: 'http://localhost:3000', // Default for local frontend
    DEBUG: true,
    ENV: 'development'
  },
  production: {
    API_URL: process.env.REACT_APP_API_URL || 'https://dc630ea5ff0b.ngrok-free.app/api',
    BASE_URL: process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : 'https://dc630ea5ff0b.ngrok-free.app',
    CORS_ORIGIN: process.env.REACT_APP_CORS_ORIGIN || 'https://audit-system-orpin.vercel.app',
    DEBUG: process.env.REACT_APP_DEBUG === 'true' || false,
    ENV: 'production'
  }
};

// Get current environment
const getEnvironment = () => {
  // Check if we're in production build
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  // Check for custom environment variable
  if (process.env.REACT_APP_ENV) {
    return process.env.REACT_APP_ENV;
  }
  // Default to development
  return 'development';
};

const currentEnv = getEnvironment();
const currentConfig = config[currentEnv];

// Export configuration
export const {
  API_URL,
  BASE_URL,
  CORS_ORIGIN,
  DEBUG,
  ENV
} = currentConfig;

// Export the full config for debugging
export const fullConfig = currentConfig;

// Helper function to check if we're in development
export const isDevelopment = () => ENV === 'development';

// Helper function to check if we're in production
export const isProduction = () => ENV === 'production';

// Log current configuration (only in development or if DEBUG is true)
if (DEBUG) {
  console.log('🔧 Environment Configuration:', {
    environment: ENV,
    apiUrl: API_URL,
    baseUrl: BASE_URL,
    corsOrigin: CORS_ORIGIN
  });
}

export default currentConfig;