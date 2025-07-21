import React from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { buildApiUrl, API_ENDPOINTS } from '../../config/api';

const RegisterPage: React.FC = () => {
  const [loading, setLoading] = React.useState<boolean>(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const handleSubmit = async (values: { username: string; name: string; password: string; email: string }) => {
    try {
      setLoading(true);
      await axios.post(buildApiUrl(API_ENDPOINTS.USER_REGISTER), values);
      message.success('注册成功，请登录');
      navigate('/login');
    } catch (error) {
      console.error('注册失败:', error);
      message.error('注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 监听用户名变化，自动填充邮箱
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const username = e.target.value;
    if (username) {
      form.setFieldsValue({
        email: `${username}@zzzjst.net`
      });
    } else {
      form.setFieldsValue({
        email: ''
      });
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f5f5' }}>
      <Card title="用户注册" style={{ width: 350 }}>
        <Form
          form={form}
          name="registerForm"
          initialValues={{ username: '', name: '', email: '', password: '' }}
          onFinish={handleSubmit}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 4, message: '用户名至少4个字符' }
            ]}
          >
            <Input placeholder="用户名" onChange={handleUsernameChange} />
          </Form.Item>

          <Form.Item
            name="name"
            rules={[
              { required: true, message: '请输入姓名' },
              { min: 2, message: '姓名至少2个字符' }
            ]}
          >
            <Input placeholder="姓名" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="邮箱" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              注册
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            已有账号? <Link to="/login">前往登录</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default RegisterPage;