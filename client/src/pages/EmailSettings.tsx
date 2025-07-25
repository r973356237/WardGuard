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
  Collapse,
  Alert,
  Modal,
  Typography
} from 'antd';
import { 
  MailOutlined, 
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

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
}

const EmailSettings: React.FC = () => {
  const [emailForm] = Form.useForm();
  const [smtpForm] = Form.useForm();
  const [testEmailForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<any>({});
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [testEmailModalVisible, setTestEmailModalVisible] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('daily');

  // 检查是否已配置基础邮件服务
  const hasBasicConfig = smtpConfig.smtp_host && smtpConfig.smtp_port && 
                         smtpConfig.smtp_user;

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
      message.error('获取用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // 获取SMTP配置
  const fetchSmtpConfig = useCallback(async () => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SYSTEM}/smtp-config`);
      if (response.data.success) {
        const config = response.data.data;
        setSmtpConfig(config);
        
        // 设置SMTP表单值（密码字段不设置，保持为空以显示星号）
        const formValues = {
          smtp_host: config.smtp_host || '',
          smtp_port: config.smtp_port || '',
          smtp_user: config.smtp_user || '',
          // smtp_password 不设置，让用户重新输入
        };
        smtpForm.setFieldsValue(formValues);
        
        // 根据配置状态设置折叠面板状态
        const isConfigured = config.smtp_host && config.smtp_port && config.smtp_user;
        setBasicConfigCollapsed(isConfigured);
        setReminderConfigCollapsed(!isConfigured);
      }
    } catch (error) {
      message.error('获取SMTP配置失败');
    }
  }, [smtpForm]);

  // 获取邮件配置
  const fetchEmailConfig = useCallback(async () => {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.SYSTEM}/email-config`);
      if (response.data.success) {
        const config = response.data.data;
        
        // 设置表单值
        const formValues = {
          recipient_email: config.recipient_email ? config.recipient_email.split(',') : [],
          reminder_frequency: config.reminder_frequency || 'daily',
          reminder_time: config.reminder_time ? dayjs(config.reminder_time, 'HH:mm') : dayjs('09:30', 'HH:mm'),
          weekly_day: config.weekly_day || '1', // 默认星期一
          monthly_day: config.monthly_day || 1,   // 默认每月1日
          email_subject: config.email_subject || '【系统提醒】物资/药品过期通知',
          email_template: config.email_template || `尊敬的管理员：

您好！系统检测到以下物资或药品已过期，请及时处理：

{EXPIRED_ITEMS}

请登录系统查看详细信息并及时处理。

系统管理员
{CURRENT_DATE}`
        };
        emailForm.setFieldsValue(formValues);
        
        // 设置频率状态
        setSelectedFrequency(config.reminder_frequency || 'daily');
      }
    } catch (error) {
      message.error('获取邮件配置失败');
    }
  }, [emailForm]);

  useEffect(() => {
    fetchSmtpConfig();
    fetchEmailConfig();
    fetchUsers();
  }, [fetchSmtpConfig, fetchEmailConfig, fetchUsers]);

  const onSmtpFinish = async (values: any) => {
    try {
      setSmtpLoading(true);
      const response = await apiClient.post(`${API_ENDPOINTS.SYSTEM}/smtp-config`, values);
      if (response.data.success) {
        message.success('SMTP配置保存成功');
        fetchSmtpConfig();
      } else {
        message.error('SMTP配置保存失败');
      }
    } catch (error) {
      message.error('保存SMTP配置失败');
    } finally {
      setSmtpLoading(false);
    }
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
      message.error('保存邮件配置失败');
    } finally {
      setLoading(false);
    }
  };

  const showTestEmailModal = () => {
    setTestEmailModalVisible(true);
  };

  const handleTestEmailSubmit = async (values: any) => {
    try {
      setTestLoading(true);
      const response = await apiClient.post(`${API_ENDPOINTS.SYSTEM}/test-email`, values);
      if (response.data.success) {
        message.success('测试邮件发送成功');
        setTestEmailModalVisible(false);
        testEmailForm.resetFields();
      } else {
        message.error('测试邮件发送失败');
      }
    } catch (error) {
      message.error('发送测试邮件失败');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title={
        <Space>
          <MailOutlined />
          邮件提醒设置
        </Space>
      }>
        <Collapse 
          defaultActiveKey={basicConfigCollapsed ? [] : ['basic']}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          style={{ marginBottom: 24 }}
        >
          <Panel 
            header={
              <Space>
                <MailOutlined />
                基础邮件配置
                {hasBasicConfig && <Text type="success">（已配置）</Text>}
              </Space>
            } 
            key="basic"
          >
            <Alert
              message="配置说明"
              description="请先配置SMTP服务器信息，用于发送邮件提醒。建议使用企业邮箱或专用的SMTP服务。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Form
              form={smtpForm}
              layout="vertical"
              onFinish={onSmtpFinish}
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
                <Input placeholder="例如：587 或 465" />
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

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={smtpLoading}>
                  保存SMTP配置
                </Button>
              </Form.Item>
            </Form>
          </Panel>
        </Collapse>

        <Collapse 
          defaultActiveKey={reminderConfigCollapsed ? [] : ['reminder']}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        >
          <Panel 
            header={
              <Space>
                <ClockCircleOutlined />
                提醒设置
              </Space>
            } 
            key="reminder"
          >
            {!hasBasicConfig && (
              <Alert
                message="请先配置基础邮件服务"
                description="在设置邮件提醒之前，请先完成上方的SMTP配置。"
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
            
            <Form
              form={emailForm}
              layout="vertical"
              onFinish={onEmailFinish}
              disabled={!hasBasicConfig}
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

              <Form.Item
                name="reminder_frequency"
                label="提醒频率"
                rules={[{ required: true, message: '请选择提醒频率' }]}
              >
                <Select 
                  placeholder="选择提醒频率"
                  onChange={(value) => setSelectedFrequency(value)}
                >
                  <Option value="daily">每天</Option>
                  <Option value="weekly">每周</Option>
                  <Option value="monthly">每月</Option>
                </Select>
              </Form.Item>

              {/* 每周的具体星期选择 */}
              {selectedFrequency === 'weekly' && (
                <Form.Item
                  name="weekly_day"
                  label="每周的星期几"
                  rules={[{ required: true, message: '请选择每周的星期几' }]}
                >
                  <Select placeholder="选择星期几">
                    <Option value="1">星期一</Option>
                    <Option value="2">星期二</Option>
                    <Option value="3">星期三</Option>
                    <Option value="4">星期四</Option>
                    <Option value="5">星期五</Option>
                    <Option value="6">星期六</Option>
                    <Option value="0">星期日</Option>
                  </Select>
                </Form.Item>
              )}

              {/* 每月的具体日期选择 */}
              {selectedFrequency === 'monthly' && (
                <Form.Item
                  name="monthly_day"
                  label="每月的哪一天"
                  rules={[{ required: true, message: '请选择每月的哪一天' }]}
                  extra="如果选择的日期在该月不存在（如2月30日），将自动调整为该月最后一天"
                >
                  <Select placeholder="选择日期">
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <Option key={day} value={day}>{day}日</Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

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

              <Form.Item
                name="email_subject"
                label="邮件主题"
                rules={[{ required: true, message: '请输入邮件主题' }]}
              >
                <Input placeholder="输入邮件主题" />
              </Form.Item>

              <Form.Item
                name="email_template"
                label="邮件模板"
                rules={[{ required: true, message: '请输入邮件模板' }]}
              >
                <TextArea 
                  rows={8} 
                  placeholder="输入邮件模板，可使用变量：{EXPIRED_ITEMS}、{CURRENT_DATE}" 
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    保存邮件配置
                  </Button>
                  <Button 
                    icon={<ExperimentOutlined />} 
                    onClick={showTestEmailModal}
                    disabled={!hasBasicConfig}
                  >
                    发送测试邮件
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Panel>
        </Collapse>

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
            initialValues={{
              test_recipients: []
            }}
          >
            <Alert
              message="测试邮件说明"
              description="此功能将使用您配置的邮件模板发送测试邮件，包含真实的过期物品数据（如果有的话），用于验证邮件配置和模板效果。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Form.Item 
              name="test_recipients" 
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
    </div>
  );
};

export default EmailSettings;