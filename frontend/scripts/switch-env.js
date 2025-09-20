#!/usr/bin/env node

/**
 * Environment Switcher Script
 * 
 * This script helps switch between development and production configurations
 * Usage: node scripts/switch-env.js [dev|prod]
 */

const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../src/config/environment.js');

const environments = {
  dev: {
    API_URL: 'http://localhost:8000/api',
    BASE_URL: 'http://localhost:8000',
    CORS_ORIGIN: 'http://localhost:3000',
    DEBUG: true,
    ENV: 'development'
  },
  prod: {
    API_URL: 'https://your-ngrok-url.ngrok.io/api',
    BASE_URL: 'https://your-ngrok-url.ngrok.io',
    CORS_ORIGIN: 'https://your-app-name.vercel.app',
    DEBUG: false,
    ENV: 'production'
  }
};

function updateConfig(env) {
  const config = environments[env];
  
  if (!config) {
    console.error('❌ Invalid environment. Use "dev" or "prod"');
    process.exit(1);
  }

  // Read current config
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  // Update the configuration
  Object.keys(config).forEach(key => {
    const regex = new RegExp(`(${key}:\\s*['"])([^'"]*)(['"])`, 'g');
    configContent = configContent.replace(regex, `$1${config[key]}$3`);
  });
  
  // Write updated config
  fs.writeFileSync(configPath, configContent);
  
  console.log(`✅ Switched to ${env} environment:`);
  console.log(`   API URL: ${config.API_URL}`);
  console.log(`   CORS Origin: ${config.CORS_ORIGIN}`);
  console.log(`   Debug: ${config.DEBUG}`);
  console.log('');
  console.log('📝 Remember to update the ngrok URL and Vercel domain in the config!');
}

function showCurrentConfig() {
  const configContent = fs.readFileSync(configPath, 'utf8');
  
  console.log('📋 Current Configuration:');
  console.log('');
  
  Object.keys(environments.dev).forEach(key => {
    const match = configContent.match(new RegExp(`${key}:\\s*['"]([^'"]*)['"]`));
    if (match) {
      console.log(`   ${key}: ${match[1]}`);
    }
  });
}

// Main execution
const env = process.argv[2];

if (!env) {
  showCurrentConfig();
  console.log('');
  console.log('Usage: node scripts/switch-env.js [dev|prod]');
  console.log('   dev  - Switch to development configuration');
  console.log('   prod - Switch to production configuration');
} else {
  updateConfig(env);
}
