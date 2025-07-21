import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, Button, Spin, Space, Modal, Popconfirm, Row, Col, message, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../config/axios';
import moment from 'moment';
import { API_ENDPOINTS } from '../config/api';

interface Supply {
  id: number;
  supply_name: string;
  storage_location: string;
  production_date: string;
  validity_period_days: number;
  supply_number: number;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiResponse {
  success: boolean;
  data: Supply[];
  total: number;
}

const Supplies: React.FC = () => {
  const [form] = Form.useForm();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [displaySupplies, setDisplaySupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchParams, setSearchParams] = useState<{
    supply_name?: string;
    storage_location?: string;
    production_date?: string;
    expiration_start?: string;
    expiration_end?: string;
  }>({});
  const [total, setTotal] = useState<number>(0);
  const [sortedAndFiltered, setSortedAndFiltered] = useState<Supply[]>([]);
  const [sorting, setSorting] = useState({ 
    field: 'id',
    order: 'ascend' as 'ascend' | 'descend' | null 
  });
  
  // 模态框状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalForm] = Form.useForm();

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    if (sorter.field || sorter.order) {
      setSorting({
        field: sorter.field,
        order: sorter.order
      });
      setCurrentPage(1);
    }
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // 获取物资数据
  const fetchSupplies = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<ApiResponse>(API_ENDPOINTS.SUPPLIES);
      if (response.data.success) {
        setSupplies(response.data.data);
      } else {
        message.error('获取物资数据失败');
      }
    } catch (error) {
      console.error('Error fetching supplies:', error);
      message.error('获取物资数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplies();
  }, []);

  const handleClearFilters = () => {
    form.resetFields();
    setSearchParams({});
    setSorting({ field: 'id', order: 'ascend' });
    setCurrentPage(1);
  };

  const handleExpiredSupplies = () => {
    const now = new Date();
    const expiredSupplies = supplies.filter(supply => {
      if (!supply.production_date || supply.validity_period_days === undefined) return false;
      const productionDate = new Date(supply.production_date);
      if (isNaN(productionDate.getTime())) return false;
      const validityDays = Number(supply.validity_period_days);
      if (isNaN(validityDays) || validityDays <= 0) return false;
      const expirationDate = new Date(productionDate);
      expirationDate.setDate(productionDate.getDate() + validityDays);
      return expirationDate < now;
    });
    setSortedAndFiltered(expiredSupplies);
    setTotal(expiredSupplies.length);
    setCurrentPage(1);
  };

  // 添加物资
  const handleAddSupply = () => {
    setModalType('add');
    setEditingSupply(null);
    modalForm.resetFields();
    setIsModalVisible(true);
  };

  // 编辑物资
  const handleEditSupply = (supply: Supply) => {
    setModalType('edit');
    setEditingSupply(supply);
    modalForm.setFieldsValue({
      ...supply,
      production_date: supply.production_date ? moment(supply.production_date) : null,
    });
    setIsModalVisible(true);
  };

  // 删除物资
  const handleDeleteSupply = async (id: number) => {
    try {
      const response = await apiClient.delete(`${API_ENDPOINTS.SUPPLIES}/${id}`);
      if (response.data.success) {
        message.success('删除成功');
        fetchSupplies();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('Error deleting supply:', error);
      message.error('删除失败');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    try {
      const values = await modalForm.validateFields();
      setSubmitLoading(true);

      // 格式化日期
      const formattedValues = {
        ...values,
        production_date: values.production_date ? values.production_date.format('YYYY-MM-DD') : null,
      };

      let response;
      if (modalType === 'add') {
        response = await apiClient.post(API_ENDPOINTS.SUPPLIES, formattedValues);
      } else {
        response = await apiClient.put(`${API_ENDPOINTS.SUPPLIES}/${editingSupply?.id}`, formattedValues);
      }

      if (response.data.success) {
        message.success(modalType === 'add' ? '添加成功' : '更新成功');
        setIsModalVisible(false);
        fetchSupplies();
      } else {
        message.error(modalType === 'add' ? '添加失败' : '更新失败');
      }
    } catch (error) {
      console.error('Error submitting supply:', error);
      message.error(modalType === 'add' ? '添加失败' : '更新失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 取消模态框
  const handleCancel = () => {
    setIsModalVisible(false);
    modalForm.resetFields();
  };

  const handleSearch = (values: typeof searchParams) => {
    setSearchParams(values);
    setCurrentPage(1);
  };

  // 处理筛选和排序
  useEffect(() => {
    let filtered: Supply[] = [...supplies];
    
    // 应用筛选条件
    const { supply_name, storage_location, production_date, expiration_start, expiration_end } = searchParams;
    if (supply_name) {
      filtered = filtered.filter(supply => 
        supply.supply_name.toLowerCase().includes(supply_name.toLowerCase())
      );
    }
    if (storage_location) {
      filtered = filtered.filter(supply => 
        storage_location ? supply.storage_location.toLowerCase().includes(storage_location.toLowerCase()) : true
      );
    }
    // 生产日期筛选
    if (production_date) {
      filtered = filtered.filter(supply => supply.production_date === production_date);
    }
    // 有效期范围筛选
    if (expiration_start || expiration_end) {
      filtered = filtered.filter(supply => {
        if (!supply.production_date || supply.validity_period_days === undefined) return false;
        const productionDate = new Date(supply.production_date);
        if (isNaN(productionDate.getTime())) return false;
        const validityDays = Number(supply.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return false;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
        const expDateStr = expirationDate.toISOString().split('T')[0];
        
        const startMatch = expiration_start ? expDateStr >= expiration_start : true;
        const endMatch = expiration_end ? expDateStr <= expiration_end : true;
        return startMatch && endMatch;
      });
    }

    // 应用排序（确保默认排序始终存在）
    filtered.sort((a, b) => {
      // 首先按过期状态排序，过期的排在前面
      const getExpirationStatus = (supply: Supply) => {
        if (!supply.production_date || supply.validity_period_days === undefined) return false;
        const productionDate = new Date(supply.production_date);
        if (isNaN(productionDate.getTime())) return false;
        const validityDays = Number(supply.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return false;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
        return expirationDate < new Date();
      };
      
      const aExpired = getExpirationStatus(a);
      const bExpired = getExpirationStatus(b);
      
      // 过期的物品排在前面
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      
      // 如果过期状态相同，则按指定字段排序
      const field = sorting.field as keyof Supply;
      if (field === 'supply_name' || field === 'storage_location') {
        const valueA = a[field] as string;
        const valueB = b[field] as string;
        return sorting.order === 'ascend' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      } else if (field === 'supply_number' || field === 'validity_period_days') {
        const valueA = a[field] as number;
        const valueB = b[field] as number;
        return sorting.order === 'ascend' ? valueA - valueB : valueB - valueA;
      } else if (field === 'production_date') {
        const dateA = new Date(a.production_date).getTime();
        const dateB = new Date(b.production_date).getTime();
        return sorting.order === 'ascend' ? dateA - dateB : dateB - dateA;
      } else if (field === 'expiration_date') {
        const getExpirationDate = (supply: Supply) => {
          if (!supply.production_date || supply.validity_period_days === undefined) return 0;
          const productionDate = new Date(supply.production_date);
          if (isNaN(productionDate.getTime())) return 0;
          const validityDays = Number(supply.validity_period_days);
          if (isNaN(validityDays) || validityDays <= 0) return 0;
          const expirationDate = new Date(productionDate);
          expirationDate.setDate(productionDate.getDate() + validityDays);
          return expirationDate.getTime();
        };
        const dateA = getExpirationDate(a);
        const dateB = getExpirationDate(b);
        return sorting.order === 'ascend' ? dateA - dateB : dateB - dateA;
      }
      // 默认按ID排序
      return sorting.order === 'ascend' ? a.id - b.id : b.id - a.id;
    });

    // 保存排序筛选后的全量数据
    setSortedAndFiltered(filtered);
    // 计算总数
    setTotal(filtered.length);
  }, [supplies, searchParams, sorting]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = sortedAndFiltered.slice(startIndex, endIndex);
    setDisplaySupplies(currentPageData);
  }, [sortedAndFiltered, currentPage, pageSize]);

  // 表格列定义
  const columns: ColumnsType<Supply> = [
    { title: '序号', key: 'index', align: 'center', render: (_, __, index) => `${(currentPage - 1) * pageSize + index + 1}` },
    { 
      title: '物资名称', 
      dataIndex: 'supply_name', 
      key: 'supply_name', 
      align: 'center',
      sorter: (a, b) => a.supply_name.localeCompare(b.supply_name),
      render: (text: string, record: Supply) => {
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return text;
        const expirationDate = new Date(record.production_date);
        expirationDate.setDate(new Date(record.production_date).getDate() + validityDays);
        const isExpired = expirationDate < new Date();
        
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
            {text}
          </span>
        );
      }
    },
    { 
      title: '存储位置', 
      dataIndex: 'storage_location', 
      key: 'storage_location', 
      align: 'center',
      sorter: (a, b) => a.storage_location.localeCompare(b.storage_location),
      render: (text: string, record: Supply) => {
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return text;
        const expirationDate = new Date(record.production_date);
        expirationDate.setDate(expirationDate.getDate() + validityDays);
        const isExpired = expirationDate < new Date();
        
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
            {text}
          </span>
        );
      }
    },
    { 
      title: '生产日期', 
      dataIndex: 'production_date', 
      key: 'production_date', 
      render: (date: string | null, record: Supply) => {
        const displayDate = date ? new Date(date).toLocaleDateString() : '-';
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return displayDate;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return displayDate;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return displayDate;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
        const isExpired = expirationDate < new Date();
        
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
            {displayDate}
          </span>
        );
      }, 
      align: 'center',
      sorter: (a, b) => new Date(a.production_date).getTime() - new Date(b.production_date).getTime() 
    },
    { 
      title: '有效期(天)', 
      dataIndex: 'validity_period_days', 
      key: 'validity_period_days', 
      align: 'center',
      sorter: (a, b) => a.validity_period_days - b.validity_period_days,
      render: (text: number, record: Supply) => {
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return text;
        const expirationDate = new Date(record.production_date);
        expirationDate.setDate(expirationDate.getDate() + validityDays);
        const isExpired = expirationDate < new Date();
        
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
            {text}
          </span>
        );
      }
    },
    { 
      title: '过期时间', 
      key: 'expiration_date', 
      render: (_: any, record: Supply) => {
        if (!record.production_date || record.validity_period_days === undefined) return '-';
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return '无效日期';
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return '无效天数';
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
        const isExpired = expirationDate < new Date();
        
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
            {expirationDate.toLocaleDateString()}
          </span>
        );
      }, 
      align: 'center',
      sorter: (a, b) => {
        const getExpirationTimestamp = (supply: Supply) => {
          if (!supply.production_date || supply.validity_period_days === undefined) return 0;
          const productionDate = new Date(supply.production_date);
          if (isNaN(productionDate.getTime())) return 0;
          const validityDays = Number(supply.validity_period_days);
          if (isNaN(validityDays) || validityDays <= 0) return 0;
          const expirationDate = new Date(productionDate);
          expirationDate.setDate(productionDate.getDate() + validityDays);
          return expirationDate.getTime();
        };
        return getExpirationTimestamp(a) - getExpirationTimestamp(b);
      }
    },
    { 
      title: '编号', 
      dataIndex: 'supply_number', 
      key: 'supply_number', 
      align: 'center',
      sorter: (a, b) => a.supply_number - b.supply_number,
      render: (text: number, record: Supply) => {
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return text;
        const expirationDate = new Date(record.production_date);
        expirationDate.setDate(expirationDate.getDate() + validityDays);
        const isExpired = expirationDate < new Date();
        
        return (
          <span style={{ color: isExpired ? '#ff4d4f' : 'inherit', fontWeight: isExpired ? 'bold' : 'normal' }}>
            {text}
          </span>
        );
      }
    },
    { 
      title: '操作', 
      key: 'action', 
      render: (_, record: Supply) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditSupply(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个物资吗？"
            onConfirm={() => handleDeleteSupply(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              danger 
              size="small"
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
      align: 'center'
    },
  ];

  return (
    <Card title={`符合条件的物资数量：${total}`} extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAddSupply}>添加物资</Button>}>
      <Form<typeof searchParams> form={form} onValuesChange={handleSearch} layout="inline" style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          <Form.Item name="supply_name" label="物资名称" >
            <Input placeholder="请输入物资名称" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="storage_location" label="存储位置" >
            <Input placeholder="请输入存储位置" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="production_date" label="生产日期" >
            <DatePicker format="YYYY-MM-DD" onChange={date => date && setSearchParams(prev => ({...prev, production_date: date.format('YYYY-MM-DD')}))} style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0 }}>
            <Form.Item name="expiration_start" label="过期时间" style={{ margin: 0, minWidth: 0 }}>
              <DatePicker format="YYYY-MM-DD" onChange={date => date && setSearchParams(prev => ({...prev, expiration_start: date.format('YYYY-MM-DD')}))} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="expiration_end" label="至" style={{ margin: 0, minWidth: 0 }}>
              <DatePicker format="YYYY-MM-DD" onChange={date => date && setSearchParams(prev => ({...prev, expiration_end: date.format('YYYY-MM-DD')}))} style={{ width: '100%' }} />
            </Form.Item>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, whiteSpace: 'nowrap', minWidth: '240px', flexShrink: 0 }}>
          <Button type="default" onClick={handleClearFilters}>清空筛选条件</Button>
          <Button type="primary" onClick={handleExpiredSupplies}>查询已过期物资</Button>
        </div>
        <Form.Item style={{ display: 'none' }}>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form.Item>
      </Form>
      <Spin spinning={loading} tip="加载中...">
        <Table 
          dataSource={displaySupplies} 
          columns={columns} 
          rowKey="id" 
          onChange={handleTableChange}
          pagination={{ 
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50']
          }} 
        />
      </Spin>

      {/* 添加/编辑物资模态框 */}
      <Modal
        title={modalType === 'add' ? '添加物资' : '编辑物资'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={submitLoading}
        width={600}
      >
        <Form
          form={modalForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supply_name"
                label="物资名称"
                rules={[{ required: true, message: '请输入物资名称' }]}
              >
                <Input placeholder="请输入物资名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="storage_location"
                label="存储位置"
                rules={[{ required: true, message: '请输入存储位置' }]}
              >
                <Input placeholder="请输入存储位置" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="production_date"
                label="生产日期"
                rules={[{ required: true, message: '请选择生产日期' }]}
              >
                <DatePicker 
                  format="YYYY-MM-DD" 
                  style={{ width: '100%' }}
                  placeholder="请选择生产日期"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="validity_period_days"
                label="有效期(天)"
                rules={[
                  { required: true, message: '请输入有效期天数' },
                  { 
                    validator: (_, value) => {
                      if (value && (isNaN(Number(value)) || Number(value) <= 0)) {
                        return Promise.reject(new Error('有效期天数必须大于0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="请输入有效期天数" 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supply_number"
                label="编号"
                rules={[
                  { required: true, message: '请输入编号' },
                  { 
                    validator: (_, value) => {
                      if (value && (isNaN(Number(value)) || Number(value) < 0)) {
                        return Promise.reject(new Error('编号不能小于0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  type="number" 
                  min="0" 
                  placeholder="请输入编号" 
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default Supplies;