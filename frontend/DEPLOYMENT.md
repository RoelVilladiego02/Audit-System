# Frontend Deployment Guide

This guide explains how to deploy the frontend to Vercel and configure it to work with your ngrok backend.

## 🚀 Quick Deployment Steps

### 1. Environment Configuration

The app uses environment-based configuration. To switch between development and production:

**For Development:**
- Uses `http://localhost:8000/api` as backend URL
- Debug logging enabled
- CORS set to `http://localhost:3000`

**For Production:**
- Uses your ngrok URL as backend
- Debug logging disabled
- CORS set to your Vercel domain

### 2. Update Production Configuration

Before deploying, update the production configuration in `src/config/environment.js`:

```javascript
production: {
  // TODO: Replace with your actual ngrok URL when deploying
  API_URL: 'https://your-ngrok-url.ngrok.io/api',
  BASE_URL: 'https://your-ngrok-url.ngrok.io',
  // TODO: Replace with your actual Vercel domain
  CORS_ORIGIN: 'https://your-app-name.vercel.app',
  DEBUG: false,
  ENV: 'production'
}
```

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   # For production deployment
   npm run deploy:vercel
   
   # For preview deployment
   npm run deploy:preview
   ```

#### Option B: Using Vercel Dashboard

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set build command: `npm run build:prod`
4. Set output directory: `build`
5. Add environment variables in Vercel dashboard:
   - `REACT_APP_ENV=production`

### 4. Environment Variables in Vercel

In your Vercel dashboard, add these environment variables:

```
REACT_APP_ENV=production
REACT_APP_API_URL=https://your-ngrok-url.ngrok.io/api
REACT_APP_CORS_ORIGIN=https://your-app-name.vercel.app
```

### 5. Backend CORS Configuration

Update your Laravel backend's CORS configuration in `backend/config/cors.php`:

```php
'allowed_origins' => [
    'http://localhost:3000',                    // Development
    'https://your-app-name.vercel.app',         // Production
],
```

## 🔧 Development vs Production Switching

### To switch to Development mode:
1. The app automatically detects development when running `npm start`
2. Uses localhost URLs and enables debug logging

### To switch to Production mode:
1. Update the configuration in `src/config/environment.js`
2. Run `npm run build:prod` for production build
3. Or set `REACT_APP_ENV=production` environment variable

## 📝 Configuration Files

- `src/config/environment.js` - Main environment configuration
- `vercel.json` - Vercel deployment configuration
- `craco.config.js` - Webpack configuration with environment support
- `package.json` - Build scripts for different environments

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors**: Make sure your backend CORS configuration includes your Vercel domain
2. **API Connection Issues**: Verify your ngrok URL is correct and accessible
3. **Build Failures**: Check that all environment variables are set correctly

### Debug Mode:
- Development: Full logging enabled
- Production: Only error logging, no debug information

## 🔄 Switching Between Environments

The app automatically detects the environment based on:
1. `NODE_ENV` (set by build process)
2. `REACT_APP_ENV` (custom environment variable)
3. Defaults to development if neither is set

No code changes needed - just update the configuration values!
