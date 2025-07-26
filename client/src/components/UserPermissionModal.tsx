import React, { useState, useEffect } from 'react';
import { Modal, Tree, Button, message, Spin, Space, Typography } from 'antd';
import { KeyOutlined, SettingOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { Key } from 'antd/es/table/interface';
import apiClient from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

const { Text } = Typography;

interface User {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: string;
}

interface Permission {
  id: number;
  code: string;
  name: string;
  description: string;
  module: string;
  operation_type: string;
  granted?: boolean;
  granted_at?: string;
  granted_by_username?: string;
  granted_by_name?: string;
}

interface ModulePermissions {
  [key: string]: {
    name: string;
    permissions: Permission[];
  };
}

interface UserPermissionModalProps {
  visible: boolean;
  user: User | null;
  onCancel: () => void;
  onSuccess?: () => void;
}

const UserPermissionModal: React.FC<UserPermissionModalProps> = ({
  visible,
  user,
  onCancel,
  onSuccess
}) => {
  const [modulePermissions, setModulePermissions] = useState<ModulePermissions>({});
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  // 获取用户权限
  const fetchUserPermissions = async (userId: number) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/permissions/user/${userId}`);

      if (response.data.success) {
        const permissions = response.data.data.permissions;
        // 设置已授权的权限ID列表
        const grantedPermissions = Object.values(permissions)
          .flat()
          .filter((perm: any) => perm.granted)
          .map((perm: any) => perm.id);
        setSelectedPermissions(grantedPermissions);
      } else {
        message.error('获取用户权限失败');
      }
    } catch (error) {
      message.error('获取用户权限失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取所有模块权限配置
  const fetchModulePermissions = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.MODULE_PERMISSIONS);
      
      if (response.data.success) {
        // 将后端返回的数组格式转换为前端需要的对象格式
        const formattedModules = response.data.modules.reduce((acc: ModulePermissions, curr: any) => {
          acc[curr.module] = {
            name: curr.module,
            permissions: curr.permissions
          };
          return acc;
        }, {});
        setModulePermissions(formattedModules);
      } else {
        message.error('获取权限配置失败');
      }
    } catch (error) {
      message.error('获取权限配置失败');
    }
  };

  // 当模态框打开且有用户时，获取权限数据
  useEffect(() => {
    if (visible && user) {
      fetchModulePermissions();
      if (user.role !== 'admin') {
        fetchUserPermissions(user.id);
      } else {
        // 管理员默认拥有所有权限，不需要设置
        setSelectedPermissions([]);
      }
    }
  }, [visible, user]);

  // 保存用户权限
  const handleSavePermissions = async () => {
    if (!user) {
      message.error('用户信息不存在');
      return;
    }

    if (user.role === 'admin') {
      message.warning('管理员默认拥有所有权限，无需设置');
      return;
    }

    try {
      setSaveLoading(true);
      
      // 构建权限数据
      const permissionData = {
        userId: user.id,
        permissions: selectedPermissions
      };

      const response = await apiClient.post(API_ENDPOINTS.USER_PERMISSIONS, permissionData);
      
      if (response.data.success) {
        message.success('权限设置保存成功');
        
        // 触发权限更新事件
        const permissionUpdateEvent = new CustomEvent('permissionUpdated', {
          detail: {
            userId: user.id,
            userName: user.name,
            updatedBy: 'admin', // 可以从当前用户信息获取
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(permissionUpdateEvent);
        
        // 调用成功回调
        if (onSuccess) {
          onSuccess();
        }
        
        // 关闭模态框
        onCancel();
      } else {
        message.error('权限设置保存失败');
      }
    } catch (error) {
      message.error('权限设置保存失败');
    } finally {
      setSaveLoading(false);
    }
  };

  // 将权限数据转换为Tree组件所需的数据结构
  const getTreeData = (): DataNode[] => {
    return Object.entries(modulePermissions).map(([moduleKey, moduleData]) => ({
      title: moduleData.name,
      key: moduleKey,
      children: moduleData.permissions.map(permission => ({
        title: (
          <Space>
            {permission.name}
            <Text type="secondary" style={{ fontSize: '12px' }}>
              ({permission.description})
            </Text>
          </Space>
        ),
        key: permission.id.toString(),
        isLeaf: true
      }))
    }));
  };

  return (
    <Modal
      title={
        <Space>
          <KeyOutlined />
          <span>权限设置 - {user?.name} ({user?.username})</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saveLoading}
          onClick={handleSavePermissions}
          icon={<SettingOutlined />}
          disabled={user?.role === 'admin'}
        >
          保存权限设置
        </Button>
      ]}
    >
      {user?.role === 'admin' ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0',
          color: '#666'
        }}>
          <KeyOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
          <div style={{ fontSize: '16px' }}>
            管理员默认拥有所有权限，无需单独设置
          </div>
        </div>
      ) : (
        <Spin spinning={loading}>
          <div style={{
            background: '#f5f5f5',
            padding: '24px',
            borderRadius: 8,
            minHeight: 400,
            maxHeight: 500,
            overflow: 'auto'
          }}>
            <Tree
              checkable
              defaultExpandAll
              checkedKeys={selectedPermissions.map(id => id.toString())}
              onCheck={(checked: Key[] | { checked: Key[], halfChecked: Key[] }) => {
                setSelectedPermissions(
                  (Array.isArray(checked) ? checked : checked.checked)
                    .map((key) => parseInt(key.toString()))
                );
              }}
              treeData={getTreeData()}
              style={{
                background: '#fff',
                padding: '16px',
                borderRadius: 4
              }}
            />
          </div>
        </Spin>
      )}
    </Modal>
  );
};

export default UserPermissionModal;