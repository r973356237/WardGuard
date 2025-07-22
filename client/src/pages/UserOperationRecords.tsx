import React, { useState, useEffect } from 'react';
import { Timeline, Card, Button, Select, Pagination, Spin, Empty, Modal, Tag, Descriptions, Typography } from 'antd';
import { ClockCircleOutlined, UserOutlined, EditOutlined, DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { useNavigate, useParams } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

interface OperationRecord {
  id: number;
  user_id: number;
  username?: string;
  user_name?: string;
  operation_type: 'add' | 'update' | 'delete';
  target_type: string;
  target_id: number;
  target_name: string;
  operation_details: any;
  operation_time: string;
}

const UserOperationRecords: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [targetType, setTargetType] = useState<string>('');
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<OperationRecord | null>(null);

  // 获取操作记录
  const fetchOperationRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const url = buildApiUrl(`${API_ENDPOINTS.OPERATION_RECORDS}/user/${userId || 'all'}?page=${pagination.current}&limit=${pagination.pageSize}${targetType ? `&targetType=${targetType}` : ''}`);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setRecords(data.data);
        setPagination({
          ...pagination,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        });
      } else {
        throw new Error('获取操作记录失败');
      }
    } catch (error) {
      console.error('获取操作记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取操作记录详情
  const fetchRecordDetail = async (recordId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const url = buildApiUrl(`${API_ENDPOINTS.OPERATION_RECORDS}/${recordId}`);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setCurrentRecord(data.data);
        setDetailVisible(true);
      } else {
        throw new Error('获取操作记录详情失败');
      }
    } catch (error) {
      console.error('获取操作记录详情失败:', error);
    }
  };

  // 初始加载和筛选条件变化时重新获取数据
  useEffect(() => {
    fetchOperationRecords();
  }, [userId, pagination.current, pagination.pageSize, targetType]);

  // 获取操作类型对应的图标和颜色
  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'add':
        return <PlusOutlined style={{ color: '#52c41a' }} />;
      case 'update':
        return <EditOutlined style={{ color: '#1890ff' }} />;
      case 'delete':
        return <DeleteOutlined style={{ color: '#f5222d' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  // 获取操作类型对应的标签
  const getOperationTag = (type: string) => {
    switch (type) {
      case 'add':
        return <Tag color="success">添加</Tag>;
      case 'update':
        return <Tag color="processing">更新</Tag>;
      case 'delete':
        return <Tag color="error">删除</Tag>;
      default:
        return <Tag color="warning">其他</Tag>;
    }
  };

  // 格式化时间
  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // 渲染操作详情
  const renderOperationDetails = (record: OperationRecord) => {
    if (!record.operation_details) return null;
    
    let details;
    try {
      details = typeof record.operation_details === 'string' 
        ? JSON.parse(record.operation_details) 
        : record.operation_details;
    } catch (e) {
      return <Text type="secondary">无法解析操作详情</Text>;
    }

    return (
      <Descriptions bordered size="small" column={1}>
        {Object.entries(details).map(([key, value]) => (
          <Descriptions.Item key={key} label={key}>
            {typeof value === 'boolean' ? (value ? '是' : '否') : String(value)}
          </Descriptions.Item>
        ))}
      </Descriptions>
    );
  };

  return (
    <div className="user-operation-records">
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4}>用户操作记录</Title>
            <div>
              <Select
                placeholder="选择操作目标类型"
                style={{ width: 200, marginRight: 16 }}
                allowClear
                onChange={(value) => setTargetType(value)}
                value={targetType}
              >
                <Option value="user">用户</Option>
                <Option value="employee">员工</Option>
                <Option value="medicine">药品</Option>
                <Option value="supply">物资</Option>
                <Option value="medical_examination">体检记录</Option>
              </Select>
              <Button type="primary" onClick={() => navigate('/users')}>
                返回用户管理
              </Button>
            </div>
          </div>
        }
      >
        <Spin spinning={loading}>
          {records.length > 0 ? (
            <Timeline mode="left">
              {records.map(record => (
                <Timeline.Item
                  key={record.id}
                  dot={getOperationIcon(record.operation_type)}
                  color={record.operation_type === 'add' ? 'green' : record.operation_type === 'update' ? 'blue' : 'red'}
                >
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>{record.user_name || record.username || `用户ID: ${record.user_id}`}</Text>
                    {' '}{getOperationTag(record.operation_type)}{' '}
                    <Text>{record.target_type === 'user' ? '用户' : record.target_type}</Text>
                    {' '}<Text strong>{record.target_name}</Text>
                    <Button 
                      type="link" 
                      size="small" 
                      onClick={() => fetchRecordDetail(record.id)}
                      icon={<InfoCircleOutlined />}
                    >
                      查看详情
                    </Button>
                  </div>
                  <div>
                    <ClockCircleOutlined style={{ marginRight: 8 }} />
                    <Text type="secondary">{formatTime(record.operation_time)}</Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Empty description="暂无操作记录" />
          )}

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Pagination
              current={pagination.current}
              pageSize={pagination.pageSize}
              total={pagination.total}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 条记录`}
              onChange={(page, pageSize) => {
                setPagination({
                  ...pagination,
                  current: page,
                  pageSize: pageSize || pagination.pageSize
                });
              }}
            />
          </div>
        </Spin>
      </Card>

      <Modal
        title="操作详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        {currentRecord && (
          <>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="操作人">
                <UserOutlined /> {currentRecord.user_name || currentRecord.username || `用户ID: ${currentRecord.user_id}`}
              </Descriptions.Item>
              <Descriptions.Item label="操作类型">
                {getOperationTag(currentRecord.operation_type)}
              </Descriptions.Item>
              <Descriptions.Item label="操作目标">
                {currentRecord.target_type === 'user' ? '用户' : currentRecord.target_type} - {currentRecord.target_name}
              </Descriptions.Item>
              <Descriptions.Item label="操作时间">
                <ClockCircleOutlined /> {formatTime(currentRecord.operation_time)}
              </Descriptions.Item>
            </Descriptions>
            
            <div style={{ marginTop: 16 }}>
              <Title level={5}>操作内容</Title>
              {renderOperationDetails(currentRecord)}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default UserOperationRecords;