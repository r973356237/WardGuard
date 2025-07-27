const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // 生产环境优化
      if (env === 'production') {
        // 代码分割优化
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              // 将 node_modules 中的代码分离到 vendor chunk
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                chunks: 'all',
                priority: 10,
              },
              // 将 antd 单独分离
              antd: {
                test: /[\\/]node_modules[\\/](antd|@ant-design)[\\/]/,
                name: 'antd',
                chunks: 'all',
                priority: 20,
              },
              // 将图表库单独分离
              charts: {
                test: /[\\/]node_modules[\\/](@antv|echarts)[\\/]/,
                name: 'charts',
                chunks: 'all',
                priority: 15,
              },
              // 公共代码
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 5,
                reuseExistingChunk: true,
              },
            },
          },
        };

        // 压缩优化
        webpackConfig.optimization.minimize = true;
      }

      return webpackConfig;
    },
  },
  babel: {
    plugins: [
      // 只在开发环境启用 React Refresh
      ...(process.env.NODE_ENV === 'development' ? ['react-refresh/babel'] : []),
    ],
  },
  // 开发服务器配置
  devServer: {
    compress: true,
    hot: true,
  },
};