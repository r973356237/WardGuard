import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, message, Statistic, Progress, Badge, Button } from 'antd';
import { 
  WarningOutlined, 
  CheckCircleOutlined, 
  UserOutlined, 
  TeamOutlined, 
  MedicineBoxOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import apiClient from '../config/axios';
import type { ProgressProps } from 'antd';
import ShiftCalendar from '../components/ShiftCalendar';
import { API_ENDPOINTS } from '../config/api';

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

interface DashboardData {
  modules: ModuleData[];
  alerts: AlertData;
  rates: RateData;
}

const Dashboard: React.FC = () => {
  // 初始化状态时提供默认值
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    modules: [],
    alerts: { expiredMedicines: 0, expiredSupplies: 0 },
    rates: { medicineExpireRate: 0, supplyExpireRate: 0 },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState<number>(0);

  // 延迟函数
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 单个API请求的重试函数
  const fetchWithRetry = async (endpoint: string, maxRetries = 3): Promise<any> => {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await apiClient.get(endpoint);
        return response;
      } catch (error) {
        console.warn(`API请求失败 (${endpoint}), 重试 ${i + 1}/${maxRetries + 1}:`, error);
        
        if (i === maxRetries) {
          throw error;
        }
        
        // 指数退避：等待时间逐渐增加
        await delay(Math.pow(2, i) * 1000);
      }
    }
  };

  const fetchDashboardData = async (isRetry = false) => {
    try {
      setLoading(true);
      setError('');

      if (isRetry) {
        setRetryCount(prev => prev + 1);
        // 重试时等待一下，确保后端服务稳定
        await delay(1000);
      }

      // 使用重试机制获取各模块数据
      const requests = [
        fetchWithRetry(API_ENDPOINTS.USERS),
        fetchWithRetry(API_ENDPOINTS.EMPLOYEES),
        fetchWithRetry(API_ENDPOINTS.MEDICINES),
        fetchWithRetry(API_ENDPOINTS.MEDICAL_EXAMINATIONS),
        fetchWithRetry(API_ENDPOINTS.SUPPLIES)
      ];

      const [
        userRes,
        employeeRes,
        medicineRes,
        examinationRes,
        supplyRes
      ] = await Promise.allSettled(requests);

      // 处理请求结果，即使部分失败也能显示可用数据
      const userData = userRes.status === 'fulfilled' ? userRes.value.data?.data || [] : [];
      const employeeData = employeeRes.status === 'fulfilled' ? employeeRes.value.data?.data || [] : [];
      const medicines = medicineRes.status === 'fulfilled' ? medicineRes.value.data?.data || [] : [];
      const examinationData = examinationRes.status === 'fulfilled' ? examinationRes.value.data?.data || [] : [];
      const supplies = supplyRes.status === 'fulfilled' ? supplyRes.value.data?.data || [] : [];

      // 检查是否有失败的请求
      const failedRequests = [userRes, employeeRes, medicineRes, examinationRes, supplyRes]
        .filter(result => result.status === 'rejected');

      if (failedRequests.length > 0) {
        console.warn(`${failedRequests.length} 个API请求失败，但继续显示可用数据`);
      }

      // 处理药品过期数据
      const expiredMedicines = medicines.filter((m: { expiration_date: string; production_date: string; validity_period_days: number }) => {
        let expirationDate;
        if (m.expiration_date) {
          expirationDate = new Date(m.expiration_date);
        } else if (m.production_date && m.validity_period_days) {
          const productionDate = new Date(m.production_date);
          expirationDate = new Date(productionDate.getTime() + m.validity_period_days * 24 * 60 * 60 * 1000);
        } else {
          return false;
        }
        return expirationDate < new Date();
      });
      const medicineExpireRate = medicines.length > 0 ? (expiredMedicines.length / medicines.length) * 100 : 0;

      // 处理物资过期数据
      const expiredSupplies = supplies.filter((s: { expiration_date: string; production_date: string; validity_period_days: number }) => {
        let expirationDate;
        if (s.expiration_date) {
          expirationDate = new Date(s.expiration_date);
        } else if (s.production_date && s.validity_period_days) {
          const productionDate = new Date(s.production_date);
          expirationDate = new Date(productionDate.getTime() + s.validity_period_days * 24 * 60 * 60 * 1000);
        } else {
          return false;
        }
        return expirationDate < new Date();
      });
      const supplyExpireRate = supplies.length > 0 ? (expiredSupplies.length / supplies.length) * 100 : 0;

      // 整合仪表盘数据
      setDashboardData({
        modules: [
          { name: '用户', value: userData.length },
          { name: '员工', value: employeeData.length },
          { name: '药品', value: medicines.length },
          { name: '体检记录', value: examinationData.length },
          { name: '物资', value: supplies.length },
        ],
        alerts: {
          expiredMedicines: expiredMedicines.length,
          expiredSupplies: expiredSupplies.length
        },
        rates: {
          medicineExpireRate,
          supplyExpireRate
        },
      });

      // 如果有部分请求失败，显示警告而不是错误
      if (failedRequests.length > 0) {
        message.warning(`部分数据加载失败，显示可用数据。失败请求数：${failedRequests.length}`);
      }
      // 移除成功提示：数据加载成功时不显示任何提示

    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      setError('获取仪表盘数据失败，请检查网络连接或稍后重试');
      message.error('获取仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 初次加载时稍微延迟，确保后端服务完全启动
    const timer = setTimeout(() => {
      fetchDashboardData();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

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
          <Card title="物资过期情况">
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
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;