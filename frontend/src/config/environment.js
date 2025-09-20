// Environment Configuration
// This file helps switch between development and production settings

const config = {
  development: {
    API_URL: 'https://your-ngrok-url.ngrok.io/api',
    BASE_URL: 'https://your-ngrok-url.ngrok.io',
    CORS_ORIGIN: 'https://your-app-name.vercel.app',
    DEBUG: true,
    ENV: 'production'
  },
  production: {
    // TODO: Replace with your actual ngrok URL when deploying
    API_URL: 'https://your-ngrok-url.ngrok.io/api',
    BASE_URL: 'https://your-ngrok-url.ngrok.io',
    // TODO: Replace with your actual Vercel domain
    CORS_ORIGIN: 'https://your-app-name.vercel.app',
    DEBUG: false,
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

// Log current configuration (only in development)
if (DEBUG) {
  console.log('🔧 Environment Configuration:', {
    environment: ENV,
    apiUrl: API_URL,
    baseUrl: BASE_URL,
    corsOrigin: CORS_ORIGIN
  });
}

export default currentConfig;
