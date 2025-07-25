import React, { useState, useEffect, useCallback } from 'react';
import { Result, Spin, message } from 'antd';
import { buildApiUrl } from '../config/api';

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  adminOnly?: boolean;
  fallback?: React.ReactNode;
}

interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: string;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredPermission,
  adminOnly = false,
  fallback
}) => {
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  // 使用useCallback优化checkPermission函数
  const checkPermission = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      // 获取用户信息
      const userResponse = await fetch(buildApiUrl('/api/users/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!userResponse.ok) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      const userData = await userResponse.json();
      if (!userData.success || !userData.data) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      const userInfo = userData.data;
      setUser(userInfo);

      // 如果是管理员专用且用户不是管理员，拒绝访问
      if (adminOnly && userInfo.role !== 'admin') {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      // 如果是管理员，直接允许访问
      if (userInfo.role === 'admin') {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // 如果没有权限要求，允许访问
      if (!requiredPermission) {
        setHasPermission(true);
        setLoading(false);
        return;
      }

      // 检查普通用户的权限
      const permissionResponse = await fetch(buildApiUrl(`/api/permissions/user/${userInfo.id}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!permissionResponse.ok) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      const permissionData = await permissionResponse.json();
      if (!permissionData.success || !permissionData.data) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      // 检查是否有所需权限
      let hasRequiredPermission = false;
      
      // 处理权限数据：可能是数组格式或者模块分组格式
      if (Array.isArray(permissionData.data)) {
        // 直接是权限数组
        permissionData.data.forEach((perm: any) => {
          if (perm.granted && perm.code === requiredPermission) {
            hasRequiredPermission = true;
          }
        });
      } else if (permissionData.data.permissions) {
        // 模块分组格式
        Object.values(permissionData.data.permissions).forEach((modulePerms: any) => {
          if (Array.isArray(modulePerms)) {
            modulePerms.forEach((perm: any) => {
              if (perm.granted && perm.code === requiredPermission) {
                hasRequiredPermission = true;
              }
            });
          }
        });
      }

      setHasPermission(hasRequiredPermission);
    } catch (error) {
        message.error('权限检查失败');
        setHasPermission(false);
      } finally {
      setLoading(false);
    }
  }, [requiredPermission, adminOnly]);

  useEffect(() => {
    checkPermission();
  }, [requiredPermission, adminOnly, checkPermission]);

  // 单独的useEffect处理权限更新监听
  useEffect(() => {
    // 监听权限更新事件
    const handlePermissionUpdate = (event: any) => {
      if (event.detail && event.detail.userId === user?.id) {
        // 重新检查权限
        checkPermission();
      }
    };

    // 监听自定义权限更新事件
    window.addEventListener('permissionUpdated', handlePermissionUpdate as EventListener);

    // 监听 localStorage 变化（作为备用方案）
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'permissionUpdated') {
        if (user) {
          setLoading(true);
          handlePermissionUpdate({ detail: { userId: user.id } } as CustomEvent);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('permissionUpdated', handlePermissionUpdate as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, requiredPermission, checkPermission]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <Spin size="large" tip="检查权限中..." />
      </div>
    );
  }

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问此页面。"
        extra={
          <div>
            {user && (
              <p>当前用户：{user.name || user.username} ({user.role === 'admin' ? '管理员' : '普通用户'})</p>
            )}
            {requiredPermission && (
              <p>所需权限：{requiredPermission}</p>
            )}
            {adminOnly && (
              <p>此页面仅限管理员访问</p>
            )}
          </div>
        }
      />
    );
  }

  return <>{children}</>;
};

export default PermissionGuard;