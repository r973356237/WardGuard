import React from 'react';
import { Card, Form, Input, Button, Space } from 'antd';
import { message } from 'antd';

type SettingsProps = {
  systemName: string;
  setSystemName: (name: string) => void;
};

const Settings: React.FC<SettingsProps> = ({ systemName, setSystemName }) => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    setSystemName(values.systemName);
    message.success('系统设置保存成功');
  };

  return (
    <Card title="系统设置">
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ systemName }}
      >
        <Form.Item
          name="systemName"
          label="系统名称"
          rules={[{ required: true, message: '请输入系统名称' }]}
        >
          <Input placeholder="输入系统名称" />
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