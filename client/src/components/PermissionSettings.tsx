import React, { useState, useEffect } from 'react';
import { Select, Tree, Button, message, Spin, Space, Card, Typography } from 'antd';
import { UserOutlined, KeyOutlined, SettingOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { Key } from 'antd/es/table/interface';
import apiClient from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

const { Title, Text } = Typography;

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
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

const PermissionSettings: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modulePermissions, setModulePermissions] = useState<ModulePermissions>({});
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS);
      if (response.data.success) {
        // 过滤掉管理员用户，因为他们默认拥有所有权限
        const filteredUsers = response.data.data.filter((user: User) => user.role !== 'admin');
        setUsers(filteredUsers);
      }
    } catch (error) {
      message.error('获取用户列表失败');
    }
  };

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

  useEffect(() => {
    fetchUsers();
    fetchModulePermissions();
  }, []);

  // 选择用户时获取其权限
  const handleUserSelect = (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setSelectedUser(user);
      fetchUserPermissions(userId);
    }
  };

  // 保存用户权限
  const handleSavePermissions = async () => {
    if (!selectedUser) {
      message.error('请先选择用户');
      return;
    }

    try {
      setSaveLoading(true);
      
      // 构建权限数据
      const permissionData = {
        userId: selectedUser.id,
        permissions: selectedPermissions
      };

      const response = await apiClient.post(API_ENDPOINTS.USER_PERMISSIONS, permissionData);
      
      if (response.data.success) {
        message.success('权限设置保存成功');
        
        // 触发权限更新事件
        const permissionUpdateEvent = new CustomEvent('permissionUpdated', {
          detail: {
            userId: selectedUser.id,
            userName: selectedUser.name,
            updatedBy: 'admin', // 可以从当前用户信息获取
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(permissionUpdateEvent);
        
        // 重新获取用户权限以确保数据同步
        await fetchUserPermissions(selectedUser.id);
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
    <Card
      title={
        <Space align="center" size="middle">
          <span>权限设置</span>
        </Space>
      }
      className="permission-settings-card"
      style={{
        width: '100%',
        borderRadius: 8
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size={24}>
        <div style={{ padding: '0 16px' }}>
          <Title level={5} style={{ marginBottom: 16 }}>
            <Space>
              <UserOutlined />
              <span>选择用户</span>
            </Space>
          </Title>
          <Select
            style={{ width: '100%', maxWidth: 400 }}
            placeholder="请选择用户"
            onChange={handleUserSelect}
            value={selectedUser?.id}

            showSearch
            optionFilterProp="children"
          >
            {users.map(user => (
              <Select.Option key={user.id} value={user.id}>
                <Space>
                  <UserOutlined />
                  <Text strong>{user.name}</Text>
                  <Text type="secondary">({user.username})</Text>
                </Space>
              </Select.Option>
            ))}
          </Select>
        </div>

        {selectedUser && (
          <div style={{ padding: '16px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
              flexWrap: 'wrap',
              gap: 16
            }}>
              <Title level={5} style={{ margin: 0 }}>
                <Space>
                  <KeyOutlined />
                  <span>设置权限</span>
                </Space>
              </Title>
              <Button
                type="primary"
                onClick={handleSavePermissions}
                loading={saveLoading}

                icon={<SettingOutlined />}
              >
                保存权限设置
              </Button>
            </div>

            <Spin spinning={loading}>
              <div style={{
                background: '#f5f5f5',
                padding: '24px',
                borderRadius: 8,
                minHeight: 400
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
          </div>
        )}
      </Space>
    </Card>
  );
};

export default PermissionSettings;