import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Space, 
  Select, 
  TimePicker, 
  message, 
  Tabs, 
  Collapse,
  Alert,
  Modal,
  Typography,
  Row,
  Col
} from 'antd';
import { 
  MailOutlined, 
  SettingOutlined, 
  ExperimentOutlined,
  CaretRightOutlined,
  UserOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../config/axios';
import { API_ENDPOINTS } from '../config/api';

const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;
const { Text } = Typography;

type SettingsProps = {
  systemName: string;
  setSystemName: (name: string) => void;
};

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

const Settings: React.FC<SettingsProps> = ({ systemName, setSystemName }) => {
  const [systemForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [testEmailForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [emailConfig, setEmailConfig] = useState<any>({});
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [testEmailModalVisible, setTestEmailModalVisible] = useState(false);

  // 检查是否已配置基础邮件服务（后端不返回密码，所以只检查其他必填字段）
  const hasBasicConfig = emailConfig.smtp_host && emailConfig.smtp_port && 
                         emailConfig.smtp_user;

  // 基础邮件配置面板的默认状态（已配置则折叠）
  const [basicConfigCollapsed, setBasicConfigCollapsed] = useState(true);
  
  // 提醒设置面板的默认状态（已配置则折叠）
  const [reminderConfigCollapsed, setReminderConfigCollapsed] = useState(false);

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      setUsersLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.USERS);
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // 获取邮件配置
  const fetchEmailConfig = useCallback(async () => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SYSTEM}/email-config`);
      if (response.data.success) {
        const config = response.data.data;
        setEmailConfig(config);
        
        // 设置表单值
        const formValues = {
          ...config,
          reminder_time: config.reminder_time ? dayjs(config.reminder_time, 'HH:mm') : dayjs('09:30', 'HH:mm'),
          recipient_email: config.recipient_email ? config.recipient_email.split(',') : []
        };
        emailForm.setFieldsValue(formValues);
        
        // 根据配置状态设置折叠面板状态
        const isConfigured = config.smtp_host && config.smtp_port && config.smtp_user;
        setBasicConfigCollapsed(isConfigured);
        setReminderConfigCollapsed(!isConfigured);
      }
    } catch (error) {
      console.error('获取邮件配置失败:', error);
    }
  }, [emailForm]);

  useEffect(() => {
    fetchEmailConfig();
    fetchUsers();
  }, [fetchEmailConfig, fetchUsers]);

  const onSystemFinish = (values: any) => {
    setSystemName(values.systemName);
    message.success('系统设置保存成功');
  };

  const onEmailFinish = async (values: any) => {
    try {
      setLoading(true);
      const formattedValues = {
        ...values,
        reminder_time: values.reminder_time ? values.reminder_time.format('HH:mm') : '09:30',
        recipient_email: Array.isArray(values.recipient_email) 
          ? values.recipient_email.join(',') 
          : values.recipient_email
      };
      
      const response = await apiClient.post(`${API_ENDPOINTS.SYSTEM}/email-config`, formattedValues);
      if (response.data.success) {
        message.success('邮件配置保存成功');
        fetchEmailConfig();
      } else {
        message.error('邮件配置保存失败');
      }
    } catch (error) {
      console.error('保存邮件配置失败:', error);
      message.error('邮件配置保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async (testRecipients?: string[]) => {
    try {
      setTestLoading(true);
      const payload = testRecipients ? { test_recipients: testRecipients.join(',') } : {};
      const response = await apiClient.post(`${API_ENDPOINTS.SYSTEM}/test-email`, payload);
      if (response.data.success) {
        message.success('测试邮件发送成功，请检查收件箱');
        setTestEmailModalVisible(false);
        testEmailForm.resetFields();
      } else {
        message.error('测试邮件发送失败');
      }
    } catch (error) {
      console.error('发送测试邮件失败:', error);
      message.error('测试邮件发送失败');
    } finally {
      setTestLoading(false);
    }
  };

  const handleTestEmailSubmit = (values: any) => {
    handleTestEmail(values.test_recipients);
  };

  const showTestEmailModal = () => {
    setTestEmailModalVisible(true);
  };

  const systemSettingsTab = (
    <Card title="自定义选项">
      <Form
        form={systemForm}
        layout="vertical"
        onFinish={onSystemFinish}
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

  const emailSettingsTab = (
    <Card title="邮件提醒设置">
      {!hasBasicConfig && (
        <Alert
          message="邮件服务未配置"
          description="请先配置基础的邮件发送服务，然后设置提醒规则。"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        form={emailForm}
        layout="vertical"
        onFinish={onEmailFinish}
      >
        <Collapse 
          activeKey={[
            ...(basicConfigCollapsed ? [] : ['basic']),
            ...(reminderConfigCollapsed ? [] : ['reminder'])
          ]}
          onChange={(keys) => {
            setBasicConfigCollapsed(!keys.includes('basic'));
            setReminderConfigCollapsed(!keys.includes('reminder'));
          }}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          style={{ marginBottom: 24 }}
        >
          <Panel 
            header={
              <Space>
                <SettingOutlined />
                <span>基础邮件服务配置</span>
                {hasBasicConfig && <Text type="success">（已配置）</Text>}
              </Space>
            } 
            key="basic"
          >
            <Form.Item
              name="smtp_host"
              label="SMTP服务器"
              rules={[{ required: true, message: '请输入SMTP服务器地址' }]}
            >
              <Input placeholder="例如：smtp.qq.com" />
            </Form.Item>

            <Form.Item
              name="smtp_port"
              label="SMTP端口"
              rules={[{ required: true, message: '请输入SMTP端口' }]}
            >
              <Input placeholder="例如：587" type="number" />
            </Form.Item>

            <Form.Item
              name="smtp_user"
              label="发件人邮箱"
              rules={[
                { required: true, message: '请输入发件人邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
            >
              <Input placeholder="例如：system@company.com" />
            </Form.Item>

            <Form.Item
              name="smtp_password"
              label="邮箱密码/授权码"
              rules={[{ required: true, message: '请输入邮箱密码或授权码' }]}
            >
              <Input.Password placeholder="输入邮箱密码或授权码" />
            </Form.Item>
          </Panel>
          
          <Panel 
            header={
              <Space>
                <UserOutlined />
                <span>提醒设置</span>
                {hasBasicConfig && <Text type="secondary">（可配置）</Text>}
              </Space>
            } 
            key="reminder"
          >
            <Form.Item
              name="recipient_email"
              label="收件人邮箱"
              rules={[{ required: true, message: '请选择收件人邮箱' }]}
              extra="可选择多个收件人，支持自定义邮箱地址"
            >
              <Select
                mode="tags"
                placeholder="选择收件人或输入自定义邮箱"
                loading={usersLoading}
                style={{ width: '100%' }}
                tokenSeparators={[',']}
                optionFilterProp="children"
              >
                {users.map(user => (
                  <Option key={user.id} value={user.email}>
                    <Space>
                      <UserOutlined />
                      {user.name} ({user.email})
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="reminder_frequency"
                  label="提醒频率"
                  rules={[{ required: true, message: '请选择提醒频率' }]}
                  extra={
                    <Text type="secondary">
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      仅在存在过期药品或物资时生效
                    </Text>
                  }
                >
                  <Select placeholder="选择提醒频率">
                    <Option value="daily">每日</Option>
                    <Option value="weekly">每周</Option>
                    <Option value="monthly">每月</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="reminder_time"
                  label={
                    <Space>
                      <ClockCircleOutlined />
                      提醒时间
                    </Space>
                  }
                  rules={[{ required: true, message: '请选择提醒时间' }]}
                >
                  <TimePicker 
                    format="HH:mm" 
                    placeholder="选择提醒时间"
                    defaultValue={dayjs('09:30', 'HH:mm')}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="email_subject"
              label="邮件主题"
              rules={[{ required: true, message: '请输入邮件主题' }]}
              initialValue="【系统提醒】物资/药品过期通知"
            >
              <Input placeholder="输入邮件主题" />
            </Form.Item>

            <Form.Item
              name="email_template"
              label="邮件模板"
              rules={[{ required: true, message: '请输入邮件模板' }]}
              initialValue={`尊敬的管理员：

您好！系统检测到以下物资或药品即将过期或已过期，请及时处理：

{EXPIRED_ITEMS}

请登录系统查看详细信息并及时处理。

此邮件由系统自动发送，请勿回复。

系统管理员
{CURRENT_DATE}`}
            >
              <TextArea 
                rows={8} 
                placeholder="输入邮件模板，可使用变量：{EXPIRED_ITEMS}、{CURRENT_DATE}" 
              />
            </Form.Item>
          </Panel>
        </Collapse>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存邮件配置
            </Button>
            <Button 
              icon={<ExperimentOutlined />} 
              onClick={() => handleTestEmail()}
              loading={testLoading}
              disabled={!hasBasicConfig}
            >
              快速测试邮件
            </Button>
            <Button 
              icon={<MailOutlined />} 
              onClick={showTestEmailModal}
              disabled={!hasBasicConfig}
            >
              自定义测试邮件
            </Button>
          </Space>
        </Form.Item>
      </Form>

      {/* 测试邮件模态框 */}
      <Modal
        title={
          <Space>
            <ExperimentOutlined />
            发送测试邮件
          </Space>
        }
        open={testEmailModalVisible}
        onCancel={() => {
          setTestEmailModalVisible(false);
          testEmailForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={testEmailForm}
          layout="vertical"
          onFinish={handleTestEmailSubmit}
        >
          <Alert
            message="测试邮件说明"
            description="此功能允许您向指定收件人发送测试邮件，用于验证邮件配置是否正确。"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          
          <Form.Item
            name="test_recipients"
            label="测试收件人"
            rules={[{ required: true, message: '请选择测试收件人' }]}
            extra="可选择多个收件人进行测试"
          >
            <Select
              mode="tags"
              placeholder="选择收件人或输入自定义邮箱"
              loading={usersLoading}
              style={{ width: '100%' }}
              tokenSeparators={[',']}
              optionFilterProp="children"
            >
              {users.map(user => (
                <Option key={user.id} value={user.email}>
                  <Space>
                    <UserOutlined />
                    {user.name} ({user.email})
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setTestEmailModalVisible(false);
                testEmailForm.resetFields();
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={testLoading}>
                发送测试邮件
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );

  const tabItems = [
    {
      key: 'email',
      label: (
        <span>
          <MailOutlined />
          邮件提醒
        </span>
      ),
      children: emailSettingsTab,
    },
    {
      key: 'system',
      label: (
        <span>
          <SettingOutlined />
          自定义选项
        </span>
      ),
      children: systemSettingsTab,
    },
  ];

  return (
    <div>
      <Tabs defaultActiveKey="email" items={tabItems} />
    </div>
  );
};

export default Settings;