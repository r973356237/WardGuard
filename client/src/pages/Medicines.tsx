import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, Button, Spin, Space, Modal, Popconfirm, Row, Col, message, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../config/axios';
import moment from 'moment';
import { API_ENDPOINTS } from '../config/api';
import { useNavigate } from 'react-router-dom';
import ImportExportButtons from '../components/ImportExportButtons';
import CollapsibleFilter from '../components/CollapsibleFilter';

interface Medicine {
  id: number;
  medicine_name: string;
  storage_location: string;
  production_date: string;
  validity_period_days: number;
  quantity: number;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
}

const Medicines: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [displayMedicines, setDisplayMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchParams, setSearchParams] = useState<{
    medicine_name?: string;
    storage_location?: string;
    production_date?: string;
    expiration_start?: string;
    expiration_end?: string;
  }>({});
  const [total, setTotal] = useState<number>(0);
  const [sortedAndFiltered, setSortedAndFiltered] = useState<Medicine[]>([]);
  // 排序状态，添加默认排序字段
  const [sorting, setSorting] = useState({ 
    field: 'id', // 默认按ID排序
    order: 'ascend' as 'ascend' | 'descend' | null 
  });

  // 模态框状态
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [modalForm] = Form.useForm();

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    // 处理排序变化
    if (sorter.field || sorter.order) {
      setSorting({
        field: sorter.field,
        order: sorter.order
      });
      setCurrentPage(1); // 排序变化时重置页码为1
    }

    // 更新分页状态
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // 获取药品数据
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.MEDICINES);
      setMedicines(response.data.data);
    } catch (error) {
      message.error('获取药品列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  // 清空筛选条件并恢复默认排序
  const handleClearFilters = () => {
    form.resetFields();
    setSearchParams({});
    setSorting({ field: 'id', order: 'ascend' }); // 恢复默认排序
    setCurrentPage(1);
  };

  const handleExpiredMedicines = () => {
    setSearchParams(prev => ({
      ...prev,
      expiration_end: moment().format('YYYY-MM-DD')
    }));
    setCurrentPage(1);
  };

  const handleSearch = (values: typeof searchParams) => {
    setSearchParams(values);
    setCurrentPage(1);
  };

  // 打开添加药品模态框
  const handleAddMedicine = () => {
    setModalType('add');
    setEditingMedicine(null);
    modalForm.resetFields();
    setIsModalVisible(true);
  };

  // 打开编辑药品模态框
  const handleEditMedicine = (medicine: Medicine) => {
    setModalType('edit');
    setEditingMedicine(medicine);
    modalForm.setFieldsValue({
      ...medicine,
      production_date: medicine.production_date ? moment(medicine.production_date) : null,
    });
    setIsModalVisible(true);
  };

  // 删除药品
  const handleDeleteMedicine = async (id: number) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.MEDICINES}/${id}`);
      message.success('删除药品成功');
      fetchMedicines(); // 重新获取数据
    } catch (error) {
        message.error('删除失败');
      }
  };

  // 提交表单（添加或编辑）
  const handleSubmit = async (values: any) => {
    try {
      setSubmitLoading(true);
      
      // 格式化日期字段
      const formattedValues = {
        ...values,
        production_date: values.production_date ? values.production_date.format('YYYY-MM-DD') : null,
      };

      if (modalType === 'add') {
        await apiClient.post(API_ENDPOINTS.MEDICINES, formattedValues);
        message.success('添加药品成功');
      } else {
        await apiClient.put(`${API_ENDPOINTS.MEDICINES}/${editingMedicine?.id}`, formattedValues);
        message.success('更新药品信息成功');
      }
      
      setIsModalVisible(false);
      modalForm.resetFields();
      fetchMedicines(); // 重新获取数据
    } catch (error) {
        message.error(modalType === 'add' ? '添加失败' : '更新失败');
      } finally {
        setSubmitLoading(false);
      }
  };

  // 取消模态框
  const handleCancel = () => {
    setIsModalVisible(false);
    modalForm.resetFields();
    setEditingMedicine(null);
  };

  // 处理筛选和排序
  useEffect(() => {
    let filtered: Medicine[] = [...medicines];
    
    // 应用筛选条件
    const { medicine_name, storage_location, production_date, expiration_start, expiration_end } = searchParams;
    if (medicine_name) {
      filtered = filtered.filter(med => 
        med.medicine_name.toLowerCase().includes(medicine_name.toLowerCase())
      );
    }
    if (storage_location) {
      filtered = filtered.filter(med => 
        storage_location ? med.storage_location.toLowerCase().includes(storage_location.toLowerCase()) : true
      );
    }
    // 生产日期筛选
    if (production_date) {
      filtered = filtered.filter(med => med.production_date === production_date);
    }
    // 有效期范围筛选
    if (expiration_start || expiration_end) {
      filtered = filtered.filter(med => {
        // 有效期为0的药品视为永久有效，不应该出现在过期筛选中
        if (med.validity_period_days === 0) return false;
        if (!med.production_date || med.validity_period_days === undefined) return false;
        const productionDate = new Date(med.production_date);
        if (isNaN(productionDate.getTime())) return false;
        const validityDays = Number(med.validity_period_days);
        if (isNaN(validityDays) || validityDays < 0) return false;
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
      const getExpirationStatus = (medicine: Medicine) => {
        if (!medicine.production_date || medicine.validity_period_days === undefined) return false;
        const productionDate = new Date(medicine.production_date);
        if (isNaN(productionDate.getTime())) return false;
        const validityDays = Number(medicine.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return false;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
        return expirationDate < new Date();
      };
      
      const aExpired = getExpirationStatus(a);
      const bExpired = getExpirationStatus(b);
      
      // 过期的药品排在前面
      if (aExpired && !bExpired) return -1;
      if (!aExpired && bExpired) return 1;
      
      // 如果过期状态相同，则按指定字段排序
      const field = sorting.field as keyof Medicine;
      if (field === 'medicine_name' || field === 'storage_location') {
        const valueA = a[field] as string;
        const valueB = b[field] as string;
        return sorting.order === 'ascend' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      } else if (field === 'quantity' || field === 'validity_period_days') {
        const valueA = a[field] as number;
        const valueB = b[field] as number;
        return sorting.order === 'ascend' ? valueA - valueB : valueB - valueA;
      } else if (field === 'production_date') {
        const dateA = new Date(a.production_date).getTime();
        const dateB = new Date(b.production_date).getTime();
        return sorting.order === 'ascend' ? dateA - dateB : dateB - dateA;
      } else if (field === 'expiration_date') {
        const getExpirationDate = (med: Medicine) => {
          if (!med.production_date || med.validity_period_days === undefined) return 0;
          const productionDate = new Date(med.production_date);
          if (isNaN(productionDate.getTime())) return 0;
          const validityDays = Number(med.validity_period_days);
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
  }, [medicines, searchParams, sorting]);

  // 处理分页逻辑
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = sortedAndFiltered.slice(startIndex, endIndex);
    setDisplayMedicines(currentPageData);
  }, [sortedAndFiltered, currentPage, pageSize]);

  // 表格列定义
  const columns: ColumnsType<Medicine> = [
    { title: '序号', key: 'index', align: 'center', render: (_, __, index) => `${(currentPage - 1) * pageSize + index + 1}` },
    { 
      title: '药品名称', 
      dataIndex: 'medicine_name', 
      key: 'medicine_name', 
      align: 'center',
      sorter: (a, b) => a.medicine_name.localeCompare(b.medicine_name),
      render: (text: string, record: Medicine) => {
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        // 有效期为0视为永久有效
        if (validityDays === 0) return text;
        if (isNaN(validityDays) || validityDays < 0) return text;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
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
      render: (text: string, record: Medicine) => {
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return text;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
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
      render: (date: string | null, record: Medicine) => {
        // 生产日期为0或null时显示为'-'
        if (!date || date === '0' || date === '0000-00-00') return '-';
        const displayDate = new Date(date).toLocaleDateString();
        
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return displayDate;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return displayDate;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays < 0) return displayDate;
        // 有效期为0视为永久有效
        if (validityDays === 0) return displayDate;
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
      render: (text: number, record: Medicine) => {
        // 有效期为0视为永久有效，显示为"-"
        if (text === 0) return '-';
        
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays < 0) return text;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
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
      render: (_: any, record: Medicine) => {
        if (!record.production_date || record.validity_period_days === undefined) return '-';
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return '无效日期';
        const validityDays = Number(record.validity_period_days);
        // 有效期为0视为永久有效
        if (validityDays === 0) return '-';
        if (isNaN(validityDays) || validityDays < 0) return '无效天数';
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
        const getExpirationTimestamp = (med: Medicine) => {
          // 有效期为0视为永久有效，排序时应该放在最后（返回一个很大的值）
          if (med.validity_period_days === 0) return Number.MAX_SAFE_INTEGER;
          if (!med.production_date || med.validity_period_days === undefined) return 0;
          const productionDate = new Date(med.production_date);
          if (isNaN(productionDate.getTime())) return 0;
          const validityDays = Number(med.validity_period_days);
          if (isNaN(validityDays) || validityDays < 0) return 0;
          const expirationDate = new Date(productionDate);
          expirationDate.setDate(productionDate.getDate() + validityDays);
          return expirationDate.getTime();
        };
        return getExpirationTimestamp(a) - getExpirationTimestamp(b);
      }
    },
    { 
      title: '库存数量', 
      dataIndex: 'quantity', 
      key: 'quantity', 
      align: 'center',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (text: number, record: Medicine) => {
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        // 有效期为0视为永久有效
        if (validityDays === 0) return text;
        if (isNaN(validityDays) || validityDays < 0) return text;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
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
      render: (record: Medicine) => (
        <Space size="middle">
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditMedicine(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个药品吗？"
            onConfirm={() => handleDeleteMedicine(record.id)}
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
    <Card 
      title={`符合条件的药品数量：${total}`} 
      extra={
        <Space>
          <ImportExportButtons 
            dataType="medicine"
            exportData={displayMedicines}
            fullData={medicines}
            onImportSuccess={fetchMedicines}
            fileNamePrefix="药品信息"
            requiredFields={['药品名称', '存储位置', '生产日期', '有效期天数', '数量']}
          />
          <Button 
            type="default" 
            icon={<HistoryOutlined />}
            onClick={() => navigate('/medicines/operation-records')}
          >
            操作记录
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddMedicine}
          >
            添加药品
          </Button>
        </Space>
      }
    >
      <CollapsibleFilter
        form={form}
        onValuesChange={handleSearch}
        onClear={handleClearFilters}
        extraActions={
          <Button type="primary" onClick={handleExpiredMedicines}>查询已过期药品</Button>
        }
      >
        <Form.Item name="medicine_name" label="药品名称">
          <Input placeholder="请输入药品名称" />
        </Form.Item>
        <Form.Item name="storage_location" label="存储位置">
          <Input placeholder="请输入存储位置" />
        </Form.Item>
        <Form.Item name="production_date" label="生产日期">
          <DatePicker 
            format="YYYY-MM-DD" 
            onChange={date => date && setSearchParams(prev => ({...prev, production_date: date.format('YYYY-MM-DD')}))} 
            style={{ width: '100%' }} 
          />
        </Form.Item>
        <Form.Item name="expiration_start" label="过期开始时间">
          <DatePicker 
            format="YYYY-MM-DD" 
            onChange={date => date && setSearchParams(prev => ({...prev, expiration_start: date.format('YYYY-MM-DD')}))} 
            style={{ width: '100%' }} 
          />
        </Form.Item>
        <Form.Item name="expiration_end" label="过期结束时间">
          <DatePicker 
            format="YYYY-MM-DD" 
            onChange={date => date && setSearchParams(prev => ({...prev, expiration_end: date.format('YYYY-MM-DD')}))} 
            style={{ width: '100%' }} 
          />
        </Form.Item>
      </CollapsibleFilter>
      <Spin spinning={loading} tip="加载中...">
        <Table 
          dataSource={displayMedicines} 
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

      {/* 添加/编辑药品模态框 */}
      <Modal
        title={modalType === 'add' ? '添加药品' : '编辑药品'}
        open={isModalVisible}
        onOk={() => modalForm.submit()}
        onCancel={handleCancel}
        confirmLoading={submitLoading}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={modalForm}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="medicine_name"
                label="药品名称"
                rules={[{ required: true, message: '请输入药品名称' }]}
              >
                <Input placeholder="请输入药品名称" />
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
                  style={{ width: '100%' }} 
                  placeholder="请选择生产日期"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="validity_period_days"
                label="有效期(天)"
                rules={[{ required: true, message: '请输入有效期天数' }]}
              >
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="请输入有效期天数" 
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="quantity"
                label="库存数量"
                rules={[{ required: true, message: '请输入库存数量' }]}
              >
                <Input 
                  type="number" 
                  min="0" 
                  placeholder="请输入库存数量" 
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};

export default Medicines;