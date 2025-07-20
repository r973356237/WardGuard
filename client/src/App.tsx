import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Dropdown, Avatar, Menu, Button, Typography } from 'antd';
import { MenuUnfoldOutlined, MenuFoldOutlined } from '@ant-design/icons';
import LoginPage from './pages/Login';
import RegisterPage from './pages/Register';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Users from './pages/Users';
import Medicines from './pages/Medicines';
import Supplies from './pages/Supplies';
import MedicalExaminations from './pages/MedicalExaminations';
import Settings from './pages/Settings';
import ShiftCalendarPage from './pages/ShiftCalendar';
import Sidebar from './components/Sidebar';
import './App.css';

// 布局组件
const MainLayout: React.FC<{ systemName: string }> = ({ systemName }) => {
  const location = useLocation();

  // 路由标题映射
  const routeTitles: { [key: string]: string } = {
    '/users': '用户管理',
    '/employees': '员工管理',
    '/medicines': '药品管理',
    '/medical-examinations': '体检管理',
    '/supplies': '物资管理',
    '/settings': '系统设置',
    '/dashboard': '仪表盘',
    '/shift-calendar': '倒班日历'
  };
  const [collapsed, setCollapsed] = useState(false);
  const { Title } = Typography;

  // 模拟用户数据 - 实际应用中应从认证系统获取
  interface User {
    username: string;
    role: string;
  }

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取当前用户信息
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('获取到的token:', token); // 调试日志: 检查token是否存在
        if (!token) {
          setLoading(false);
          return;
        }

        console.log('发送请求到:', '/api/users/me'); // 调试日志: 检查请求URL
        const response = await fetch('/api/users/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        // 直接使用data而非data.data，适配API返回结构
        setUser(data.data);

        // 验证数据是否正确获取
        console.log('用户信息获取成功:', data);
      } catch (error) {
        console.error('获取用户信息失败:', error);
        // 清除无效token并跳转登录
        localStorage.removeItem('token');
        setUser(null);
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

  const username = loading ? '加载中...' : user?.username || '未登录';
  // 将中文角色转换为头像类型键名
  const userType = user?.role === 'admin' ? 'admin' : 'normal';

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <AntLayout.Sider
        theme="dark"
        width={200}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)' }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid #f0f0f0', color: 'white' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined style={{ color: 'white' }} /> : <MenuFoldOutlined style={{ color: 'white' }} />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ marginRight: 8, color: 'white' }}
            />
            <Title level={5} style={{ margin: 0, display: collapsed ? 'none' : 'block', color: 'white' }}>{systemName}</Title>
          </div>
          <Sidebar />
        </div>
      </AntLayout.Sider>
      <AntLayout>
        <AntLayout.Header style={{ background: '#fff', padding: '0 24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, color: '#1890ff' }}>{routeTitles[location.pathname] || '主页'}</h1>
          <Dropdown
            overlay={(
              <Menu>
                <Menu.Item key="profile">个人信息</Menu.Item>
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
              <Avatar src={defaultAvatars[userType as keyof typeof defaultAvatars]} alt={username} style={{ marginRight: 8 }} />
              <span>{username}</span>
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
  const [systemName, setSystemName] = useState('WardGuard');

  useEffect(() => {
    const fetchSystemName = async () => {
      try {
        const response = await fetch('/api/system-name');
        if (!response.ok) {
          throw new Error('获取系统名称失败');
        }
        const data = await response.json();
        setSystemName(data.systemName);
      } catch (error) {
        console.error('获取系统名称失败:', error);
      }
    };

    fetchSystemName();
  }, []);

  const handleSetSystemName = async (name: string) => {
    try {
      const response = await fetch('/api/system-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ systemName: name })
      });

      if (!response.ok) {
        throw new Error('设置系统名称失败');
      }

      setSystemName(name);
    } catch (error) {
      console.error('设置系统名称失败:', error);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout systemName={systemName} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="employees" element={<Employees />} />
          <Route path="medicines" element={<Medicines />} />
          <Route path="supplies" element={<Supplies />} />
          <Route path="medical-examinations" element={<MedicalExaminations />} />
          <Route path="shift-calendar" element={<ShiftCalendarPage />} />
          <Route 
            path="settings"
            element={<Settings systemName={systemName} setSystemName={handleSetSystemName} />}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;