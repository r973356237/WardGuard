import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, message, Statistic, Progress, Badge } from 'antd';
import { 
  WarningOutlined, 
  CheckCircleOutlined, 
  UserOutlined, 
  TeamOutlined, 
  MedicineBoxOutlined 
} from '@ant-design/icons';
import axios from 'axios';
import type { ProgressProps } from 'antd';
import ShiftCalendar from '../components/ShiftCalendar';

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // 获取各模块数据并指定响应类型
        const [
          userRes,
          employeeRes,
          medicineRes,
          examinationRes,
          supplyRes
        ] = await Promise.all([
          axios.get<{ success: boolean; data: any[] }>('/api/users', { headers }),
          axios.get<{ success: boolean; data: any[] }>('/api/employees', { headers }),
          axios.get<{ success: boolean; data: any[] }>('/api/medicines', { headers }),
          axios.get<{ success: boolean; data: any[] }>('/api/medical-examinations', { headers }),
          axios.get<{ success: boolean; data: any[] }>('/api/supplies', { headers })
        ]);

        // 处理药品过期数据
        const medicines = medicineRes.data?.data || [];
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
        const supplies = supplyRes.data?.data || [];
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
            { name: '用户', value: userRes.data?.data.length || 0 },
            { name: '员工', value: employeeRes.data?.data.length || 0 },
            { name: '药品', value: medicines.length },
            { name: '体检记录', value: examinationRes.data?.data.length || 0 },
            { name: '物资', value: supplies.length },
          ],
          alerts: {
            expiredMedicines: expiredMedicines.length,
            expiredSupplies: expiredSupplies.length // 物资过期数量
          },
          rates: {
            medicineExpireRate,
            supplyExpireRate // 物资过期比例
          },
        });
      } catch (error) {
        message.error('获取仪表盘数据失败');
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div >
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