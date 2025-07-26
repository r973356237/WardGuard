import React, { useState, useEffect, useCallback } from 'react';
import { Menu, message } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  MedicineBoxOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  MailOutlined
} from '@ant-design/icons';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: string;
}

const Sidebar: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);

  // 获取用户信息和权限
  const fetchUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl(API_ENDPOINTS.USER_INFO), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUser(data.data);
          
          // 如果是管理员，直接设置所有权限
          if (data.data.role === 'admin') {
            setUserPermissions(['all']);
          } else {
            // 获取普通用户的权限
            fetchUserPermissions(data.data.id);
          }
        }
      }
    } catch (error) {
      message.error('获取用户信息失败');
    }
  }, []);

  const fetchUserPermissions = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(buildApiUrl(`/api/permissions/user/${userId}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data && data.data.permissions) {
          // 提取用户拥有的权限代码
          const permissions: string[] = [];
          
          Object.entries(data.data.permissions).forEach(([module, modulePerms]: [string, any]) => {
            modulePerms.forEach((perm: any) => {
              if (perm.granted) {
                permissions.push(perm.code);
              }
            });
          });
          
          setUserPermissions(permissions);
        }
      }
    } catch (error) {
      message.error('获取用户权限失败');
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  // 单独的useEffect处理权限更新监听
  useEffect(() => {
    // 监听权限更新事件
    const handlePermissionUpdate = (event: CustomEvent) => {
      const { userId } = event.detail;
      
      // 如果更新的是当前用户的权限，重新获取权限
      if (user && user.id === userId) {
        fetchUserPermissions(userId);
      }
    };

    // 监听自定义权限更新事件
    window.addEventListener('permissionUpdated', handlePermissionUpdate as EventListener);

    // 监听 localStorage 变化（作为备用方案）
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'permissionUpdated') {
        if (user) {
          fetchUserPermissions(user.id);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('permissionUpdated', handlePermissionUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  // 检查用户是否有指定权限
  const hasPermission = (permission: string) => {
    if (user?.role === 'admin') return true;
    return userPermissions.includes(permission);
  };

  // 定义所有菜单项及其所需权限
  const allMenuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: <Link to="/">主页</Link>,
      permission: null, // 主页所有人都可以访问
      adminOnly: false,
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: <Link to="/users">用户管理</Link>,
      permission: 'users:view',
      adminOnly: true, // 用户管理只有管理员可以访问
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: <Link to="/employees">员工管理</Link>,
      permission: 'employees:view',
      adminOnly: false,
    },
    {
      key: '/medicines',
      icon: <MedicineBoxOutlined />,
      label: <Link to="/medicines">药品管理</Link>,
      permission: 'medicines:view',
      adminOnly: false,
    },
    {
      key: '/supplies',
      icon: <ShoppingOutlined />,
      label: <Link to="/supplies">物资管理</Link>,
      permission: 'supplies:view',
      adminOnly: false,
    },
    {
      key: '/medical-examinations',
      icon: <FileTextOutlined />,
      label: <Link to="/medical-examinations">体检记录</Link>,
      permission: 'medical_examinations:view',
      adminOnly: false,
    },
    {
      key: '/email-settings',
      icon: <MailOutlined />,
      label: <Link to="/email-settings">邮件提醒</Link>,
      permission: null,
      adminOnly: true, // 邮件设置只有管理员可以访问
    },
  ];

  // 根据权限过滤菜单项
  const menuItems = allMenuItems
    .filter(item => {
      // 如果是管理员专用项目，检查是否为管理员
      if (item.adminOnly && user?.role !== 'admin') {
        return false;
      }
      
      // 如果没有权限要求，显示菜单项
      if (!item.permission) {
        return true;
      }
      
      // 检查是否有所需权限
      return hasPermission(item.permission);
    })
    .map(item => ({
      key: item.key,
      icon: item.icon,
      label: item.label
    }));

  return (
    <Menu
      selectedKeys={[location.pathname]}
      mode="inline"
      theme="dark"
      items={menuItems}
      style={{ height: '100%', borderRight: 0 }}
    />
  );
};

export default Sidebar;