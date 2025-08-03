module.exports = {
    webpack: {
        configure: (webpackConfig, { env, paths }) => {
            // Configure dev server for development
            if (env === 'development') {
                webpackConfig.devServer = {
                    ...webpackConfig.devServer,
                    headers: {
                        'Access-Control-Max-Headers': '32768', // 32KB limit
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, X-XSRF-TOKEN, X-HTTP-Method-Override',
                        'Access-Control-Allow-Credentials': 'true',
                        'Access-Control-Allow-Origin': 'http://localhost:3000',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS'
                    },
                    // Increase header size limits
                    maxHeaderSize: 32768, // 32KB
                    // Configure proxy to handle large headers if needed
                    proxy: {
                        '/api': {
                            target: 'http://localhost:8000',
                            changeOrigin: true,
                            secure: false,
                            headers: {
                                'Connection': 'keep-alive'
                            }
                        }
                    },
                    // Handle favicon.ico requests
                    historyApiFallback: {
                        rewrites: [
                            { from: /^\/favicon\.ico$/, to: '/public/favicon.ico' }
                        ]
                    }
                };
            }
            
            return webpackConfig;
        },
    },
    devServer: (devServerConfig, { env, paths, proxy, allowedHost }) => {
        if (env === 'development') {
            devServerConfig.headers = {
                ...devServerConfig.headers,
                'Access-Control-Max-Headers': '32768'
            };
        }
        return devServerConfig;
    }
};