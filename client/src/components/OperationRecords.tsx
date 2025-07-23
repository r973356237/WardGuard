import React, { useState, useEffect, useCallback } from 'react';
import { Timeline, Card, Button, Select, Pagination, Spin, Empty, Modal, Tag, Descriptions, Typography } from 'antd';
import { ClockCircleOutlined, UserOutlined, EditOutlined, DeleteOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { buildApiUrl, API_ENDPOINTS } from '../config/api';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

interface OperationRecord {
  id: number;
  user_id: number;
  username?: string;
  user_name?: string;
  operation_type: 'create' | 'update' | 'delete';
  target_type: string;
  target_id: number;
  target_name: string;
  operation_details: any;
  operation_time: string;
}

interface OperationRecordsProps {
  targetType?: string; // 指定目标类型，如 'employee', 'medicine', 'supply', 'medical_examination'
  title?: string; // 页面标题
  backPath?: string; // 返回路径
  backButtonText?: string; // 返回按钮文本
}

const OperationRecords: React.FC<OperationRecordsProps> = ({
  targetType,
  title = '操作记录',
  backPath,
  backButtonText = '返回'
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<OperationRecord[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0
  });
  const [selectedTargetType, setSelectedTargetType] = useState<string>(targetType || '');
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<OperationRecord | null>(null);

  // 获取操作记录
  const fetchOperationRecords = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      // 使用用户操作记录端点，支持targetType过滤
      let url = buildApiUrl(`${API_ENDPOINTS.OPERATION_RECORDS}/user/all?page=${pagination.current}&limit=${pagination.pageSize}`);
      
      // 如果指定了目标类型，添加到查询参数
      const filterType = selectedTargetType || targetType;
      if (filterType) {
        url += `&targetType=${filterType}`;
      }

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
  }, [pagination.current, pagination.pageSize, selectedTargetType, targetType, navigate]);

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
  }, [fetchOperationRecords]);

  // 获取目标类型的中文显示
  const getTargetTypeDisplay = (targetType: string) => {
    switch (targetType) {
      case 'user':
        return '用户';
      case 'employee':
        return '员工';
      case 'medicine':
        return '药品';
      case 'supply':
        return '物资';
      case 'medical_examination':
        return '体检记录';
      default:
        return targetType;
    }
  };

  // 获取操作类型对应的图标和颜色
  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'create':
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
      case 'create':
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
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
  };

  // 渲染操作详情
  const renderOperationDetails = (record: OperationRecord) => {
    if (!record.operation_details) return null;
    
    // 如果操作详情是字符串，直接显示
    if (typeof record.operation_details === 'string') {
      // 尝试解析JSON，如果失败则作为普通字符串显示
      try {
        const parsed = JSON.parse(record.operation_details);
        // 如果解析成功且是对象，则按对象格式显示
        if (typeof parsed === 'object' && parsed !== null) {
          return (
            <Descriptions bordered size="small" column={1}>
              {Object.entries(parsed).map(([key, value]) => (
                <Descriptions.Item key={key} label={getFieldLabel(key)}>
                  {formatFieldValue(key, value)}
                </Descriptions.Item>
              ))}
            </Descriptions>
          );
        } else {
          // 如果解析结果是字符串，直接显示
          return <Text>{String(parsed)}</Text>;
        }
      } catch (e) {
        // 解析失败，作为普通字符串显示
        return <Text>{record.operation_details}</Text>;
      }
    }
    
    // 如果操作详情已经是对象，按对象格式显示
    if (typeof record.operation_details === 'object') {
      return (
        <Descriptions bordered size="small" column={1}>
          {Object.entries(record.operation_details).map(([key, value]) => (
            <Descriptions.Item key={key} label={getFieldLabel(key)}>
              {formatFieldValue(key, value)}
            </Descriptions.Item>
          ))}
        </Descriptions>
      );
    }
    
    return <Text type="secondary">无法解析操作详情</Text>;
  };

  // 获取字段的中文标签
  const getFieldLabel = (key: string) => {
    const labelMap: { [key: string]: string } = {
      'username': '用户名',
      'name': '姓名',
      'email': '邮箱',
      'role': '角色',
      'status': '状态',
      'password_changed': '密码是否修改',
      'employee_id': '员工编号',
      'employee_number': '员工编号',
      'department': '部门',
      'position': '职位',
      'phone': '电话',
      'hire_date': '入职日期',
      'birth_date': '出生日期',
      'work_start_date': '工作开始日期',
      'gender': '性别',
      'workshop': '车间',
      'original_company': '原公司',
      'total_exposure_time': '总接触时间',
      'pre_hire_exposure_time': '入职前接触时间',
      'id_number': '身份证号',
      'medicine_name': '药品名称',
      'specification': '规格',
      'unit': '单位',
      'price': '价格',
      'stock_quantity': '库存数量',
      'expiry_date': '过期日期',
      'supplier': '供应商',
      'supply_name': '物资名称',
      'category': '类别',
      'quantity': '数量',
      'location': '存放位置',
      'purchase_date': '采购日期',
      'examination_date': '体检日期',
      'examination_type': '体检类型',
      'result': '体检结果',
      'notes': '备注',
      'next_examination_date': '下次体检日期'
    };
    return labelMap[key] || key;
  };

  // 格式化字段值
  const formatFieldValue = (key: string, value: any) => {
    if (value === null || value === undefined) {
      return <Text type="secondary">-</Text>;
    }
    
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    
    // 日期字段格式化
    if (key.includes('date') || key.includes('time')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          }).replace(/\//g, '-');
        }
      } catch (e) {
        // 如果不是有效日期，直接显示原值
      }
    }
    
    // 价格字段格式化
    if (key === 'price' && typeof value === 'number') {
      return `¥${value.toFixed(2)}`;
    }
    
    return String(value);
  };

  return (
    <div className="operation-records">
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4}>{title}</Title>
            <div>
              {!targetType && (
                <Select
                  placeholder="选择操作目标类型"
                  style={{ width: 200, marginRight: 16 }}
                  allowClear
                  onChange={(value) => setSelectedTargetType(value)}
                  value={selectedTargetType}
                >
                  <Option value="user">用户</Option>
                  <Option value="employee">员工</Option>
                  <Option value="medicine">药品</Option>
                  <Option value="supply">物资</Option>
                  <Option value="medical_examination">体检记录</Option>
                </Select>
              )}
              {backPath && (
                <Button type="primary" onClick={() => navigate(backPath)}>
                  {backButtonText}
                </Button>
              )}
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
                  color={record.operation_type === 'create' ? 'green' : record.operation_type === 'update' ? 'blue' : 'red'}
                >
                  <div style={{ marginBottom: 8 }}>
                    <Text strong>{record.user_name || record.username || `用户ID: ${record.user_id}`}</Text>
                    {' '}{getOperationTag(record.operation_type)}{' '}
                    <Text>{getTargetTypeDisplay(record.target_type)}</Text>
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
                {getTargetTypeDisplay(currentRecord.target_type)} - {currentRecord.target_name}
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

export default OperationRecords;