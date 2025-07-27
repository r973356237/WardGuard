import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Dropdown, Avatar, Menu, Spin } from 'antd';
import { buildApiUrl, API_ENDPOINTS } from './config/api';
import PerformanceMonitor from './components/PerformanceMonitor';
import { preloadCriticalRoutes } from './utils/preload';
import './App.css';

// 懒加载页面组件
const LoginPage = lazy(() => import('./pages/Login'));
const RegisterPage = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
const UserOperationRecords = lazy(() => import('./pages/UserOperationRecords'));
const Employees = lazy(() => import('./pages/Employees'));
const Medicines = lazy(() => import('./pages/Medicines'));
const Supplies = lazy(() => import('./pages/Supplies'));
const MedicalExaminations = lazy(() => import('./pages/MedicalExaminations'));
const EmailSettings = lazy(() => import('./pages/EmailSettings'));

// 懒加载组件
const Sidebar = lazy(() => import('./components/Sidebar'));
const PermissionGuard = lazy(() => import('./components/PermissionGuard'));
const OperationRecords = lazy(() => import('./components/OperationRecords'));

// 加载中组件
const LoadingSpinner: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '200px' 
  }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

// 布局组件
const MainLayout: React.FC = () => {
  const location = useLocation();

  // 路由标题映射
  const routeTitles: { [key: string]: string } = {
    '/': '主页',
    '/users': '用户管理',
    '/user-operation-records': '用户操作记录',
    '/employees': '员工管理',
    '/employees/operation-records': '员工操作记录',
    '/medicines': '药品管理',
    '/medicines/operation-records': '药品操作记录',
    '/supplies': '物资管理',
    '/supplies/operation-records': '物资操作记录',
    '/medical-examinations': '体检记录管理',
    '/medical-examinations/operation-records': '体检记录操作记录',
    '/email-settings': '邮件提醒设置',
    '/dashboard': '仪表盘'
  };

  // 模拟用户数据 - 实际应用中应从认证系统获取
  interface User {
    username: string;
    name: string;
    role: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取当前用户信息
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(buildApiUrl(API_ENDPOINTS.USER_ME), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.data) {
          setUser(data.data);
          // 用户信息加载完成后，预加载关键路由
          preloadCriticalRoutes();
        } else {
          throw new Error('获取用户信息失败');
        }
      } catch (error) {
        // 获取用户信息失败时，清除本地存储并跳转到登录页
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // 定义不同角色的默认头像
  const defaultAvatars = {
    admin: 'https://gw.alipayobjects.com/zos/rmsportal/BiazfanxmamNRoxxVxka.png', // 管理员头像
    normal: 'https://gw.alipayobjects.com/zos/rmsportal/cnrhVkzwxjPwAaCfPbdc.png'   // 普通用户头像
  };

  const displayName = loading ? '加载中...' : (user?.name || user?.username || '未登录');
  // 将中文角色转换为头像类型键名
  const userType = user?.role === 'admin' ? 'admin' : 'normal';

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <AntLayout.Sider
        theme="dark"
        width={200}
        style={{ boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)' }}
      >
        <div>
          {/* Logo 区域 */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '20px 16px', 
            borderBottom: '1px solid #434343', 
            color: 'white',
            minHeight: '80px',
            maxHeight: '80px'
          }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ 
                maxWidth: '160px',
                width: 'auto',
                height: 'auto',
                maxHeight: '60px',
                objectFit: 'contain'
              }} 
            />
          </div>
          
          <Suspense fallback={<LoadingSpinner />}>
            <Sidebar />
          </Suspense>
        </div>
      </AntLayout.Sider>
      <AntLayout>
        <AntLayout.Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#1890ff' }}>{routeTitles[location.pathname] || '主页'}</h1>
          <Dropdown
            overlay={(
              <Menu>
                <Menu.Item key="logout" onClick={() => {
                  localStorage.removeItem('token');
                  window.location.href = '/login';
                }}>
                  退出登录
                </Menu.Item>
              </Menu>
            )}
            placement="bottomRight"
          >
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <Avatar src={defaultAvatars[userType as keyof typeof defaultAvatars]} alt={displayName} style={{ marginRight: 8 }} />
              <span>{displayName}</span>
            </div>
          </Dropdown>
        </AntLayout.Header>
        <AntLayout.Content style={{ padding: '24px' }}>
          <Outlet /> 
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
  );
};

// 保护路由组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <>
      <PerformanceMonitor />
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route 
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={
              <Suspense fallback={<LoadingSpinner />}>
                <Dashboard />
              </Suspense>
            } />
            <Route path="users" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard adminOnly={true}>
                  <Users />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="user-operation-records/:userId?" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard adminOnly={true}>
                  <UserOperationRecords />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="employees" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard requiredPermission="employees:view">
                  <Employees />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="employees/operation-records" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard requiredPermission="employees:view">
                  <OperationRecords 
                    targetType="employee" 
                    title="员工操作记录" 
                    backPath="/employees" 
                    backButtonText="返回员工管理" 
                  />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="medicines" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard requiredPermission="medicines:view">
                  <Medicines />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="medicines/operation-records" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard requiredPermission="medicines:view">
                  <OperationRecords 
                    targetType="medicine" 
                    title="药品操作记录" 
                    backPath="/medicines" 
                    backButtonText="返回药品管理" 
                  />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="supplies" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard requiredPermission="supplies:view">
                  <Supplies />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="supplies/operation-records" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard requiredPermission="supplies:view">
                  <OperationRecords 
                    targetType="supply" 
                    title="物资操作记录" 
                    backPath="/supplies" 
                    backButtonText="返回物资管理" 
                  />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="medical-examinations" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard requiredPermission="medical_examinations:view">
                  <MedicalExaminations />
                </PermissionGuard>
              </Suspense>
            } />
            <Route path="medical-examinations/operation-records" element={
              <Suspense fallback={<LoadingSpinner />}>
                <PermissionGuard requiredPermission="medical_examinations:view">
                  <OperationRecords 
                    targetType="medical_examination" 
                    title="体检记录操作记录" 
                    backPath="/medical-examinations" 
                    backButtonText="返回体检记录管理" 
                  />
                </PermissionGuard>
              </Suspense>
            } />
            <Route 
              path="email-settings"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <PermissionGuard adminOnly={true}>
                    <EmailSettings />
                  </PermissionGuard>
                </Suspense>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
         </Routes>
       </Suspense>
     </Router>
   </>
  );
};

export default App;