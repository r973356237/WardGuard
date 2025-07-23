import React, { useState, useEffect } from 'react';
import { Select, Tree, Button, message, Spin, Space, Card, Typography, Tabs } from 'antd';
import { UserOutlined, KeyOutlined, SettingOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import type { Key } from 'antd/es/table/interface';
import apiClient from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

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
  const [userPermissions, setUserPermissions] = useState<ModulePermissions>({});
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
      console.log('开始获取用户权限，用户ID:', userId);
      const response = await apiClient.get(`/api/permissions/user/${userId}`);
      console.log('获取用户权限响应:', response);

      if (response.data.success) {
        console.log('成功获取用户权限:', response.data);
        const permissions = response.data.data.permissions;
        // 将后端返回的数组格式转换为前端需要的对象格式
        const formattedPermissions = Object.entries(permissions).reduce((acc: ModulePermissions, [module, perms]: [string, any]) => {
          acc[module] = {
            name: module,
            permissions: perms
          };
          return acc;
        }, {});
        console.log('格式化后的用户权限数据:', formattedPermissions);
        setUserPermissions(formattedPermissions);
        // 设置已授权的权限ID列表
        const grantedPermissions = Object.values(permissions)
          .flatMap((perms: any) => perms)
          .filter((permission: Permission) => permission.granted)
          .map((permission: Permission) => permission.id);
        console.log('已授权的权限ID列表:', grantedPermissions);
        setSelectedPermissions(grantedPermissions);
      } else {
        console.error('获取用户权限失败:', response.data.message);
        message.error(`获取用户权限失败: ${response.data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('获取用户权限异常:', error);
      message.error(`获取用户权限失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 获取所有模块权限配置
  const fetchModulePermissions = async () => {
    try {
      console.log('开始获取模块权限配置，使用API端点:', API_ENDPOINTS.MODULE_PERMISSIONS);
      const response = await apiClient.get(API_ENDPOINTS.MODULE_PERMISSIONS);
      console.log('获取模块权限配置响应:', response);
      
      if (response.data.success) {
        console.log('成功获取模块权限配置:', response.data);
        // 将后端返回的数组格式转换为前端需要的对象格式
        const formattedModules = response.data.modules.reduce((acc: ModulePermissions, curr: any) => {
          acc[curr.module] = {
            name: curr.module,
            permissions: curr.permissions
          };
          return acc;
        }, {});
        console.log('格式化后的模块权限数据:', formattedModules);
        setModulePermissions(formattedModules);
      } else {
        console.error('获取模块权限配置失败:', response.data.message);
        message.error(`获取权限配置失败: ${response.data.message || '未知错误'}`);
      }
    } catch (error) {
      console.error('获取模块权限配置异常:', error);
      message.error(`获取权限配置失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
    if (!selectedUser) return;

    try {
      setSaveLoading(true);
      const response = await apiClient.put(
        `/api/users/${selectedUser.id}/permissions`,
        { permissions: selectedPermissions }
      );

      if (response.data.success) {
        message.success('权限保存成功');
        fetchUserPermissions(selectedUser.id);
      }
    } catch (error) {
      message.error('保存权限失败');
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