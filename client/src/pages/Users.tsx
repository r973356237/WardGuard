import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Card, Space, Tag, Popconfirm, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import { API_ENDPOINTS } from '../config/api';
import ApiClient from '../utils/api_client';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import { ApiResponse } from '../utils/api_client';

type User = {
  id: number;
  username: string;
  name: string;
  role: string;
  status: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
};

const Users: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();
  // 移除实例化

  // 获取用户数据
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.get<User[]>(API_ENDPOINTS.USERS);
      if (response.success) {
        setUsers(response.data || []);
      } else {
        message.error('获取用户列表失败');
      }
    } catch (error) {
      message.error('获取用户列表失败');
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 添加用户
  const handleAddUser = () => {
    setModalType('add');
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 编辑用户
  const handleEditUser = (user: User) => {
    setModalType('edit');
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalVisible(true);
  };

  // 查看用户操作记录
  const handleViewOperationRecords = (userId: number) => {
    navigate(`/user-operation-records/${userId}`);
  };

  // 删除用户
  const handleDeleteUser = async (id: number) => {
    try {
      const response = await ApiClient.delete<null>(`${API_ENDPOINTS.USERS}/${id}`);
      if (response.success) {
        message.success('删除成功');
        fetchUsers();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error('删除失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitLoading(true);

      let response;
      if (modalType === 'add') {
        response = await ApiClient.post<User>(API_ENDPOINTS.USERS, values);
      } else {
        response = await ApiClient.put<User>(`${API_ENDPOINTS.USERS}/${editingUser?.id}`, values);
      }

      if (response.success) {
        message.success(modalType === 'add' ? '添加成功' : '更新成功');
        setIsModalVisible(false);
        fetchUsers();
      } else {
        message.error(modalType === 'add' ? '添加失败' : '更新失败');
      }
    } catch (error) {
      console.error('Error submitting user:', error);
      message.error(modalType === 'add' ? '添加失败' : '更新失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 取消模态框
  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', key: 'username', align: 'center' },
    { title: '姓名', dataIndex: 'name', key: 'name', align: 'center' },
    { title: '邮箱', dataIndex: 'email', key: 'email', align: 'center' },
    { 
      title: '角色', 
      dataIndex: 'role', 
      key: 'role', 
      align: 'center',
      render: (role: string) => {
        const roleMap: { [key: string]: { text: string; color: string } } = {
          admin: { text: '管理员', color: 'red' },
          user: { text: '普通用户', color: 'blue' }
        };
        const roleInfo = roleMap[role] || { text: role, color: 'default' };
        return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
      }
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      align: 'center',
      render: (status: string) => {
        const statusMap: { [key: string]: { text: string; color: string } } = {
          active: { text: '激活', color: 'green' },
          inactive: { text: '未激活', color: 'orange' }
        };
        const statusInfo = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    { 
      title: '操作', 
      key: 'action', 
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          >
            编辑
          </Button>
          <Button 
            type="default" 
            size="small" 
            icon={<HistoryOutlined />}
            onClick={() => handleViewOperationRecords(record.id)}
          >
            操作记录
          </Button>
          <Popconfirm
            title="确定要删除这个用户吗？"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
      align: 'center'
    },
  ];

  return (
    <>
      <Card title="用户管理" extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>添加用户</Button>}>
        <Table dataSource={users} columns={columns} rowKey="id" loading={loading} />
      </Card>

      <Modal
        title={modalType === 'add' ? '添加用户' : '编辑用户'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={submitLoading}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'user',
            status: 'active'
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' },
                  { max: 20, message: '用户名最多20个字符' }
                ]}
              >
                <Input 
                  placeholder="请输入用户名" 
                  onChange={(e) => {
                    // 自动生成邮箱
                    const username = e.target.value;
                    if (username && modalType === 'add') {
                      form.setFieldsValue({ email: `${username}@zzzjst.net` });
                    }
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[
                  { required: true, message: '请输入姓名' },
                  { max: 50, message: '姓名最多50个字符' }
                ]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="邮箱将自动生成" />
              </Form.Item>
            </Col>
            <Col span={12}>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="角色"
                name="role"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  <Select.Option value="admin">管理员</Select.Option>
                  <Select.Option value="user">普通用户</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Select.Option value="active">激活</Select.Option>
                  <Select.Option value="inactive">未激活</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {modalType === 'add' && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="密码"
                  name="password"
                  rules={[
                    { required: true, message: '请输入密码' },
                    { min: 6, message: '密码至少6个字符' }
                  ]}
                >
                  <Input.Password placeholder="请输入密码" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="确认密码"
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: '请确认密码' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('两次输入的密码不一致'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="请确认密码" />
                </Form.Item>
              </Col>
            </Row>
          )}
        </Form>
      </Modal>
    </>
  );
};

export default Users;