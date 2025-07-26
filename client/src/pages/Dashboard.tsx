import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Spin, message, Statistic, Progress, Badge, Button, Tag } from 'antd';
import { 
  WarningOutlined, 
  CheckCircleOutlined, 
  UserOutlined, 
  TeamOutlined, 
  MedicineBoxOutlined,
  ReloadOutlined,
  MailOutlined,
  ClockCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import apiClient from '../config/axios';
import type { ProgressProps } from 'antd';
import ShiftCalendar from '../components/ShiftCalendar';
import { API_ENDPOINTS } from '../config/api';
import { useNavigate } from 'react-router-dom';

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 单个API请求的重试函数
const fetchWithRetry = async (endpoint: string, maxRetries = 3): Promise<any> => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await apiClient.get(endpoint);
      return response;
    } catch (error) {
      if (i === maxRetries) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
};

// 提醒频率中文映射
const reminderFrequencyMap: Record<string, string> = {
  'daily': '每天',
  'weekly': '每周',
  'monthly': '每月'
};

// 定义数据类型接口
interface ModuleData {
  name: string;
  value: number;
}

interface AlertData {
  expiredMedicines: number;
  expiredSupplies: number; // 物资过期数量
}

interface RateData {
  medicineExpireRate: number;
  supplyExpireRate: number; // 物资过期比例
}

interface EmailServiceStatus {
  configured: boolean;
  emailConfig: {
    recipientEmail: string;
    reminderFrequency: string;
    weeklyDay?: string;
    monthlyDay?: number;
    reminderTime: string | null;
    lastUpdated: string;
  } | null;
  smtpConfigured: boolean;
  lastEmailSent: string | null;
  recentEmailStatus: Array<{
    status: string;
    sentAt: string;
  }>;
}

interface DashboardData {
  modules: ModuleData[];
  alerts: AlertData;
  rates: RateData;
  emailService?: EmailServiceStatus;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  // 初始化状态时提供默认值
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    modules: [],
    alerts: { expiredMedicines: 0, expiredSupplies: 0 },
    rates: { medicineExpireRate: 0, supplyExpireRate: 0 },
    emailService: {
      configured: false,
      emailConfig: null,
      smtpConfigured: false,
      lastEmailSent: null,
      recentEmailStatus: []
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);

  // 跳转到邮件设置页面
  const goToEmailSettings = () => {
    navigate('/email-settings');
  };

  const fetchDashboardData = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      setError('');

      if (isRetry) {
        setRetryCount(prev => prev + 1);
        // 重试时等待一下，确保后端服务稳定
        await delay(1000);
      }

      // 使用新的仪表盘统计API，只需要一个请求
      const response = await fetchWithRetry(API_ENDPOINTS.DASHBOARD_STATS, 3);
      
      if (response.data?.success && response.data?.data) {
        const dashboardStats = response.data.data;
        
        // 直接使用后端返回的统计数据
        setDashboardData(dashboardStats);
        
        // 数据加载成功时不显示任何提示
      } else {
        throw new Error('仪表盘数据格式错误');
      }

    } catch (error) {
      setError('获取仪表盘数据失败，请检查网络连接或稍后重试');
      message.error('获取仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 初次加载时稍微延迟，确保后端服务完全启动
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 500);

    return () => clearTimeout(timer);
  }, [fetchDashboardData]);

  // 手动重试函数
  const handleRetry = () => {
    fetchDashboardData(true);
  };

  return (
    <div>
      {/* 错误提示和重试按钮 */}
      {error && (
        <Card style={{ marginBottom: 16, borderColor: '#ff4d4f' }}>
          <div style={{ textAlign: 'center' }}>
            <WarningOutlined style={{ color: '#ff4d4f', fontSize: 24, marginBottom: 8 }} />
            <div style={{ marginBottom: 16 }}>{error}</div>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={handleRetry}
              loading={loading}
            >
              重新加载 {retryCount > 0 && `(已重试 ${retryCount} 次)`}
            </Button>
          </div>
        </Card>
      )}

      {/* 左右布局结构 */}
      <Row gutter={[16, 16]}>
        {/* 左侧：倒班日历 */}
        <Col xs={24} lg={12}>
          <Card title="倒班日历" bordered={false} style={{ height: '100%' }}>
            <ShiftCalendar />
          </Card>
        </Col>
        
        {/* 右侧：系统数据总览 */}
        <Col xs={24} lg={12}>
          {/* 数据概览卡片 */}
          <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
            <Col xs={12} sm={8} lg={8}>
              <Card bordered={false} className="stat-card">
                <Statistic
                  title="总用户数"
                  value={dashboardData.modules.find(m => m.name === '用户')?.value || 0}
                  prefix={<UserOutlined style={{ color: '#52c41a' }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={8}>
              <Card bordered={false} className="stat-card">
                <Statistic
                  title="员工总数"
                  value={dashboardData.modules.find(m => m.name === '员工')?.value || 0}
                  prefix={<TeamOutlined style={{ color: '#1890ff' }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={8}>
              <Card bordered={false} className="stat-card">
                <Statistic
                  title="体检记录"
                  value={dashboardData.modules.find(m => m.name === '体检记录')?.value || 0}
                  prefix={<MedicineBoxOutlined style={{ color: '#faad14' }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* 药品过期情况 */}
          <Card title="药品过期情况" style={{ marginBottom: '16px' }}>
            <Spin spinning={loading} tip="正在加载数据...">
              <div style={{ padding: '16px' }}>
                <Row gutter={[16, 0]}>
                  <Col span={8}>
                    <Statistic
                      title="药品总数"
                      value={dashboardData.modules.find(m => m.name === '药品')?.value || 0}
                      suffix={<Badge status="error" text={`${dashboardData.alerts.expiredMedicines} 过期`} />}
                    />
                  </Col>
                  <Col span={16}>
                    <Progress
                      percent={dashboardData.rates.medicineExpireRate}
                      status={dashboardData.rates.medicineExpireRate > 10 ? 'exception' : 'active' as ProgressProps['status']}
                      size="default"
                      format={(percent) => `${percent?.toFixed(1)}% 药品已过期`}
                    />
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', color: dashboardData.alerts.expiredMedicines > 0 ? '#ff4d4f' : '#52c41a' }}>
                      {dashboardData.alerts.expiredMedicines > 0 ? (
                        <> 
                          <WarningOutlined style={{ marginRight: '8px' }} />
                          <span>共有 {dashboardData.alerts.expiredMedicines} 种药品已过期，请及时处理</span>
                        </>
                      ) : (
                        <> 
                          <CheckCircleOutlined style={{ marginRight: '8px' }} />
                          <span>所有药品均在有效期内</span>
                        </>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>
            </Spin>
          </Card>

          {/* 物资过期情况 */}
          <Card title="物资过期情况" style={{ marginBottom: '16px' }}>
            <Spin spinning={loading} tip="正在加载数据...">
              <div style={{ padding: '16px' }}>
                <Row gutter={[16, 0]}>
                  <Col span={8}>
                    <Statistic
                      title="物资总数"
                      value={dashboardData.modules.find(m => m.name === '物资')?.value || 0}
                      suffix={<Badge status="warning" text={`${dashboardData.alerts.expiredSupplies} 过期`} />}
                    />
                  </Col>
                  <Col span={16}>
                    <Progress
                      percent={dashboardData.rates.supplyExpireRate}
                      status={dashboardData.rates.supplyExpireRate > 10 ? 'exception' : 'active' as ProgressProps['status']}
                      size="default"
                      format={(percent) => `${percent?.toFixed(1)}% 物资已过期`}
                    />
                    <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', color: dashboardData.alerts.expiredSupplies > 0 ? '#ff4d4f' : '#52c41a' }}>
                      {dashboardData.alerts.expiredSupplies > 0 ? (
                        <> 
                          <WarningOutlined style={{ marginRight: '8px' }} />
                          <span>共有 {dashboardData.alerts.expiredSupplies} 种物资已过期，请及时处理</span>
                        </>
                      ) : (
                        <> 
                          <CheckCircleOutlined style={{ marginRight: '8px' }} />
                          <span>所有物资均在有效期内</span>
                        </>
                      )}
                    </div>
                  </Col>
                </Row>
              </div>
            </Spin>
          </Card>
          
          {/* 邮件服务状态 */}
          <Card title="邮件服务状态" extra={<SettingOutlined onClick={goToEmailSettings} style={{ cursor: 'pointer' }} />}>
            <Spin spinning={loading} tip="正在加载数据...">
              <div style={{ padding: '16px' }}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', color: dashboardData.emailService?.configured ? '#52c41a' : '#ff4d4f' }}>
                      <MailOutlined style={{ marginRight: '8px', fontSize: '18px' }} />
                      <span style={{ fontSize: '16px' }}>
                        {dashboardData.emailService?.configured 
                          ? '邮件服务已配置并正常运行' 
                          : '邮件服务未配置或配置不完整'}
                      </span>
                    </div>
                  </Col>
                  
                  {dashboardData.emailService?.emailConfig && (
                    <>
                      <Col span={12}>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#666', fontSize: '14px' }}>收件人设置</span>
                        </div>
                        <div>
                          {dashboardData.emailService.emailConfig.recipientEmail ? (
                            (() => {
                              // 处理收件人显示：如果包含中文分号，说明是用户名；否则是邮箱
                              const recipients = dashboardData.emailService.emailConfig.recipientEmail;
                              if (recipients.includes('；')) {
                                // 用户名形式，用中文分号分割
                                return recipients.split('；').map((name, index) => (
                                  <Tag key={index} color="blue" style={{ marginBottom: '4px' }}>
                                    {name.trim()}
                                  </Tag>
                                ));
                              } else {
                                // 邮箱形式，用逗号或分号分割
                                return recipients.split(/[,;]/).map((email, index) => (
                                  <Tag key={index} color="geekblue" style={{ marginBottom: '4px' }}>
                                    {email.trim()}
                                  </Tag>
                                ));
                              }
                            })()
                          ) : (
                            <Tag color="default">未设置</Tag>
                          )}
                        </div>
                      </Col>
                      <Col span={12}>
                        <Statistic 
                          title="提醒频率" 
                          value={
                            (() => {
                              const frequency = dashboardData.emailService.emailConfig.reminderFrequency;
                              if (!frequency) return '未设置';
                              
                              const frequencyText = reminderFrequencyMap[frequency] || frequency;
                              
                              if (frequency === 'weekly' && dashboardData.emailService.emailConfig.weeklyDay) {
                                const weekDayMap: Record<string, string> = {
                                  '0': '星期日',
                                  '1': '星期一',
                                  '2': '星期二',
                                  '3': '星期三',
                                  '4': '星期四',
                                  '5': '星期五',
                                  '6': '星期六'
                                };
                                return `${frequencyText}（${weekDayMap[dashboardData.emailService.emailConfig.weeklyDay] || dashboardData.emailService.emailConfig.weeklyDay}）`;
                              }
                              
                              if (frequency === 'monthly' && dashboardData.emailService.emailConfig.monthlyDay) {
                                return `${frequencyText}（${dashboardData.emailService.emailConfig.monthlyDay}日）`;
                              }
                              
                              return frequencyText;
                            })()
                          }
                          prefix={<ClockCircleOutlined />}
                          valueStyle={{ fontSize: '14px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic 
                          title="提醒时间" 
                          value={dashboardData.emailService.emailConfig.reminderTime || '未设置'}
                          valueStyle={{ fontSize: '14px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic 
                          title="最近发送" 
                          value={dashboardData.emailService.lastEmailSent 
                            ? new Date(dashboardData.emailService.lastEmailSent).toLocaleString('zh-CN') 
                            : '尚未发送'}
                          valueStyle={{ fontSize: '14px' }}
                        />
                      </Col>
                    </>
                  )}
                  
                  {!dashboardData.emailService?.configured && (
                    <Col span={24}>
                      <div style={{ color: '#1890ff', cursor: 'pointer', textAlign: 'center' }}>
                        <Button type="primary" icon={<SettingOutlined />} onClick={goToEmailSettings}>配置邮件服务</Button>
                      </div>
                    </Col>
                  )}
                </Row>
              </div>
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;