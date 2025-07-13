import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { Card, Table, Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';

type User = {
  username: string;
  role: string;
  status: string;
  key: string;
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUsers(response.data.data);
      } catch (error) {
        message.error('获取用户列表失败');
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const columns: ColumnsType<User> = [
    { title: '用户名', dataIndex: 'username', key: 'username', align: 'center' },
    { title: '角色', dataIndex: 'role', key: 'role', align: 'center' },
    { title: '状态', dataIndex: 'status', key: 'status', align: 'center' },
    { 
      title: '操作', 
      key: 'action', 
      render: () => (
        <Space size="middle">
          <Button type="primary" size="small">编辑</Button>
          <Button danger size="small">删除</Button>
        </Space>
      ),
      align: 'center'
    },
  ];

  return (
    <Card title="用户管理" extra={<Button type="primary">添加用户</Button>}>
      <Table dataSource={users} columns={columns} rowKey="key" loading={loading} />
    </Card>
  );
};

export default Users;