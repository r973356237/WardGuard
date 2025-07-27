import React, { useEffect } from 'react';

// 性能监控组件
const PerformanceMonitor: React.FC = () => {
  useEffect(() => {
    // 监控页面加载性能
    const measurePerformance = () => {
      if ('performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.fetchStart;
          const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          const firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0;
          const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;

          console.log('🚀 性能指标:', {
            '页面加载时间': `${Math.round(loadTime)}ms`,
            'DOM加载时间': `${Math.round(domContentLoaded)}ms`,
            '首次绘制': `${Math.round(firstPaint)}ms`,
            '首次内容绘制': `${Math.round(firstContentfulPaint)}ms`,
          });

          // 如果加载时间超过3秒，给出警告
          if (loadTime > 3000) {
            console.warn('⚠️ 页面加载时间过长，建议优化');
          }
        }
      }
    };

    // 页面加载完成后测量性能
    if (document.readyState === 'complete') {
      measurePerformance();
    } else {
      window.addEventListener('load', measurePerformance);
    }

    return () => {
      window.removeEventListener('load', measurePerformance);
    };
  }, []);

  return null;
};

export default PerformanceMonitor;