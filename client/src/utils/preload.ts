// 预加载策略工具
export const preloadRoute = (routeImport: () => Promise<any>) => {
  // 在空闲时间预加载路由
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      routeImport();
    });
  } else {
    // 降级方案：延迟预加载
    setTimeout(() => {
      routeImport();
    }, 2000);
  }
};

// 预加载关键路由
export const preloadCriticalRoutes = () => {
  // 预加载用户最可能访问的页面
  preloadRoute(() => import('../pages/Dashboard'));
  preloadRoute(() => import('../pages/Users'));
  preloadRoute(() => import('../pages/Employees'));
};

// 鼠标悬停预加载
export const preloadOnHover = (routeImport: () => Promise<any>) => {
  let isPreloaded = false;
  
  return () => {
    if (!isPreloaded) {
      isPreloaded = true;
      routeImport();
    }
  };
};