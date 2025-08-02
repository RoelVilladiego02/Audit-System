module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            webpackConfig.devServer = {
                ...webpackConfig.devServer,
                headers: {
                    'Access-Control-Max-Headers': '16384', // Increase to 16KB
                },
            };
            return webpackConfig;
        },
    },
};