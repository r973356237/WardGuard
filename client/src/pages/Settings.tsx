import React from 'react';
import { Card, Form, Input, Button, Select, Space } from 'antd';
import { message } from 'antd';

const { Option } = Select;

const Settings: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log('保存系统设置:', values);
    message.success('系统设置保存成功');
  };

  return (
    <Card title="系统设置">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ systemName: 'WardGuard', theme: 'light' }}
      >
        <Form.Item
          name="systemName"
          label="系统名称"
          rules={[{ required: true, message: '请输入系统名称' }]}
        >
          <Input placeholder="输入系统名称" />
        </Form.Item>

        <Form.Item
          name="theme"
          label="主题设置"
          rules={[{ required: true, message: '请选择主题' }]}
        >
          <Select placeholder="选择主题">
            <Option value="light">浅色主题</Option>
            <Option value="dark">深色主题</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="apiUrl"
          label="API 地址"
          rules={[{ required: true, message: '请输入API地址' }]}
        >
          <Input placeholder="输入API基础地址" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">保存设置</Button>
            <Button>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Settings;