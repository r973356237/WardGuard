import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, Button, Spin, Space, Modal, Popconfirm, Row, Col, message, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../config/axios';
import dayjs from 'dayjs';
import { API_ENDPOINTS } from '../config/api';
import ImportExportButtons from '../components/ImportExportButtons';
import CollapsibleFilter from '../components/CollapsibleFilter';

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
  const navigate = useNavigate();
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

  // 批量操作状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<Supply[]>([]);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [batchOperationType, setBatchOperationType] = useState<'update' | 'delete'>('update');
  const [batchForm] = Form.useForm();

  const handleTableChange = (pagination: any, _: any, sorter: any) => {
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
      message.error('获取物资列表失败');
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

  const handleExpiringSoonSupplies = () => {
    setSearchParams(prev => ({
      ...prev,
      expiration_start: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      expiration_end: dayjs().add(30, 'day').format('YYYY-MM-DD')
    }));
    setCurrentPage(1);
  };

  const handleExpiredSupplies = () => {
    // 使用 searchParams 来筛选已过期物资（expiration_end 设置为昨天，或者今天？）
    // 现有的 handleExpiredSupplies 逻辑是直接过滤数组，这里改为统一使用 searchParams
    setSearchParams(prev => ({
      ...prev,
      expiration_end: dayjs().format('YYYY-MM-DD')
    }));
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
      production_date: supply.production_date ? dayjs(supply.production_date) : null,
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
      message.error(modalType === 'add' ? '添加失败' : '更新失败');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 取消模态框
  const handleCancel = () => {
    setIsModalVisible(false);
    modalForm.resetFields();
    setEditingSupply(null);
  };

  // 批量操作相关函数
  const handleBatchUpdate = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要更新的物资');
      return;
    }
    setBatchOperationType('update');
    batchForm.resetFields();
    setBatchModalVisible(true);
  };

  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的物资');
      return;
    }
    setBatchOperationType('delete');
    setBatchModalVisible(true);
  };

  const handleBatchSubmit = async () => {
    try {
      if (batchOperationType === 'delete') {
        // 批量删除
        const response = await apiClient.delete(API_ENDPOINTS.SUPPLIES_BATCH, {
          data: { ids: selectedRowKeys }
        });
        if (response.data.success) {
          message.success(`成功删除 ${selectedRowKeys.length} 个物资`);
          setSelectedRowKeys([]);
          setSelectedRows([]);
          setBatchModalVisible(false);
          fetchSupplies();
        } else {
          message.error('批量删除失败');
        }
      } else {
        // 批量更新
        const values = await batchForm.validateFields();
        const updateData: any = {};
        
        // 只包含用户填写的字段
        if (values.supply_name) updateData.supply_name = values.supply_name;
        if (values.storage_location) updateData.storage_location = values.storage_location;
        if (values.production_date) updateData.production_date = values.production_date.format('YYYY-MM-DD');
        if (values.validity_period_days !== undefined) updateData.validity_period_days = values.validity_period_days;
        if (values.supply_number !== undefined) updateData.supply_number = values.supply_number;

        if (Object.keys(updateData).length === 0) {
          message.warning('请至少填写一个要更新的字段');
          return;
        }

        const response = await apiClient.put(API_ENDPOINTS.SUPPLIES_BATCH, {
          ids: selectedRowKeys,
          updateData
        });

        if (response.data.success) {
          message.success(`成功更新 ${selectedRowKeys.length} 个物资`);
          setSelectedRowKeys([]);
          setSelectedRows([]);
          setBatchModalVisible(false);
          batchForm.resetFields();
          fetchSupplies();
        } else {
          message.error('批量更新失败');
        }
      }
    } catch (error) {
      message.error(batchOperationType === 'delete' ? '批量删除失败' : '批量更新失败');
    }
  };

  const handleBatchCancel = () => {
    setBatchModalVisible(false);
    batchForm.resetFields();
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[], newSelectedRows: Supply[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
      setSelectedRows(newSelectedRows);
    },
    onSelectAll: (selected: boolean) => {
      if (selected) {
        const newKeys = displaySupplies.map(item => item.id);
        setSelectedRowKeys(newKeys);
        setSelectedRows(displaySupplies);
      } else {
        setSelectedRowKeys([]);
        setSelectedRows([]);
      }
    },
  };

  // 处理搜索（支持联合筛选）
  const handleSearch = (_: any, allValues: any) => {
    // 确保日期字段被正确格式化为字符串
    const formattedValues = {
      ...allValues,
      expiration_start: allValues.expiration_start && dayjs.isDayjs(allValues.expiration_start) 
        ? allValues.expiration_start.format('YYYY-MM-DD') 
        : allValues.expiration_start,
      expiration_end: allValues.expiration_end && dayjs.isDayjs(allValues.expiration_end) 
        ? allValues.expiration_end.format('YYYY-MM-DD') 
        : allValues.expiration_end,
      production_date: allValues.production_date && dayjs.isDayjs(allValues.production_date)
        ? allValues.production_date.format('YYYY-MM-DD')
        : allValues.production_date
    };
    setSearchParams(formattedValues);
    setCurrentPage(1);
  };

  // 处理筛选和排序（支持联合筛选）
  useEffect(() => {
    let filtered: Supply[] = [...supplies];
    
    // 应用联合筛选条件（所有条件同时生效）
    const { supply_name, storage_location, production_date, expiration_start, expiration_end } = searchParams;
    
    // 物资名称筛选
    if (supply_name && supply_name.trim()) {
      filtered = filtered.filter(supply => 
        supply.supply_name.toLowerCase().includes(supply_name.toLowerCase().trim())
      );
    }
    
    // 存储位置筛选
    if (storage_location && storage_location.trim()) {
      filtered = filtered.filter(supply => 
        supply.storage_location.toLowerCase().includes(storage_location.toLowerCase().trim())
      );
    }
    
    // 生产日期筛选
    if (production_date && production_date.trim()) {
      filtered = filtered.filter(supply => supply.production_date === production_date);
    }
    
    // 有效期范围筛选（支持开始和结束时间的联合筛选）
    if (expiration_start || expiration_end) {
      filtered = filtered.filter(supply => {
        // 有效期为0的物资视为永久有效，不应该出现在过期筛选中
        if (supply.validity_period_days === 0) return false;
        if (!supply.production_date || supply.validity_period_days === undefined) return false;
        
        const productionDate = dayjs(supply.production_date);
        if (!productionDate.isValid()) return false;
        
        const validityDays = Number(supply.validity_period_days);
        if (isNaN(validityDays) || validityDays < 0) return false;
        
        const expirationDate = productionDate.add(validityDays, 'day');
        const expDateStr = expirationDate.format('YYYY-MM-DD');
        
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
        // 生产日期为0或null时显示为'-'
        if (!date || date === '0' || date === '0000-00-00') return '-';
        const displayDate = new Date(date).toLocaleDateString();
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return displayDate;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return displayDate;
        const validityDays = Number(record.validity_period_days);
        // 有效期为0视为永久有效
        if (validityDays === 0) return displayDate;
        if (isNaN(validityDays) || validityDays < 0) return displayDate;
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
      sorter: (a, b) => {
        // 处理生产日期为0或null的情况
        if (!a.production_date || a.production_date === '0' || a.production_date === '0000-00-00') return 1;
        if (!b.production_date || b.production_date === '0' || b.production_date === '0000-00-00') return -1;
        return new Date(a.production_date).getTime() - new Date(b.production_date).getTime();
      }
    },
    { 
      title: '有效期(天)', 
      dataIndex: 'validity_period_days', 
      key: 'validity_period_days', 
      align: 'center',
      sorter: (a, b) => a.validity_period_days - b.validity_period_days,
      render: (text: number, record: Supply) => {
        // 有效期为0视为永久有效，显示为"-"
        if (text === 0) return '-';
        
        // 检查是否过期
        if (!record.production_date || record.validity_period_days === undefined) return text;
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return text;
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays < 0) return text;
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
        const getExpirationTimestamp = (supply: Supply) => {
          // 有效期为0视为永久有效，排序时应该放在最后（返回一个很大的值）
          if (supply.validity_period_days === 0) return Number.MAX_SAFE_INTEGER;
          if (!supply.production_date || supply.validity_period_days === undefined) return 0;
          const productionDate = new Date(supply.production_date);
          if (isNaN(productionDate.getTime())) return 0;
          const validityDays = Number(supply.validity_period_days);
          if (isNaN(validityDays) || validityDays < 0) return 0;
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
        // 有效期为0视为永久有效
        if (validityDays === 0) return text;
        if (isNaN(validityDays) || validityDays < 0) return text;
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
    <Card title={`符合条件的物资数量：${total}`} extra={
      <Space>
        <ImportExportButtons 
          dataType="supply"
          exportData={displaySupplies}
          fullData={supplies}
          onImportSuccess={fetchSupplies}
          fileNamePrefix="物资信息"
          requiredFields={['物资名称', '存储位置', '生产日期', '有效期天数', '编号']}
        />
        <Button 
          type="default" 
          icon={<HistoryOutlined />}
          onClick={() => navigate('/supplies/operation-records')}
        >
          操作记录
        </Button>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleAddSupply}
        >
          添加物资
        </Button>
      </Space>
    }>
      <CollapsibleFilter
        form={form}
        onValuesChange={handleSearch}
        onClear={handleClearFilters}
        extraActions={
          <Space>
            <Button onClick={handleExpiringSoonSupplies}>一个月内到期</Button>
            <Button danger onClick={handleExpiredSupplies}>查询已过期物资</Button>
          </Space>
        }
      >
        <Form.Item name="supply_name" label="物资名称">
          <Input placeholder="请输入物资名称" />
        </Form.Item>
        <Form.Item name="storage_location" label="存储位置">
          <Input placeholder="请输入存储位置" />
        </Form.Item>
        <Form.Item name="production_date" label="生产日期">
          <DatePicker 
            format="YYYY-MM-DD" 
            onChange={date => date && setSearchParams(prev => ({...prev, production_date: date.format('YYYY-MM-DD')}))} 
            style={{ width: '100%' }}
            allowClear
          />
        </Form.Item>
        <Form.Item name="expiration_start" label="过期开始时间">
          <DatePicker 
            format="YYYY-MM-DD" 
            onChange={date => date && setSearchParams(prev => ({...prev, expiration_start: date.format('YYYY-MM-DD')}))} 
            style={{ width: '100%' }}
            allowClear
          />
        </Form.Item>
        <Form.Item name="expiration_end" label="过期结束时间">
          <DatePicker 
            format="YYYY-MM-DD" 
            onChange={date => date && setSearchParams(prev => ({...prev, expiration_end: date.format('YYYY-MM-DD')}))} 
            style={{ width: '100%' }}
            allowClear
          />
        </Form.Item>
      </CollapsibleFilter>
      
      {/* 批量操作按钮 */}
      {selectedRowKeys.length > 0 && (
        <div style={{ marginBottom: 16, padding: 16, backgroundColor: '#f0f2f5', borderRadius: 6 }}>
          <Space>
            <span>已选择 {selectedRowKeys.length} 项</span>
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={handleBatchUpdate}
            >
              批量更新
            </Button>
            <Popconfirm
              title={`确定要删除选中的 ${selectedRowKeys.length} 个物资吗？`}
              onConfirm={handleBatchDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button 
                danger 
                icon={<DeleteOutlined />}
              >
                批量删除
              </Button>
            </Popconfirm>
            <Button onClick={() => {setSelectedRowKeys([]); setSelectedRows([])}}>
              取消选择
            </Button>
          </Space>
        </div>
      )}

      <Spin spinning={loading} tip="加载中...">
        <Table 
          dataSource={displaySupplies} 
          columns={columns} 
          rowKey="id" 
          rowSelection={rowSelection}
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
                  allowClear
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
                      if (value && (isNaN(Number(value)) || Number(value) < 0)) {
                        return Promise.reject(new Error('有效期天数不能小于0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  type="number" 
                  min="0" 
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

      {/* 批量操作模态框 */}
      <Modal
        title={batchOperationType === 'update' ? '批量更新物资' : '批量删除物资'}
        open={batchModalVisible}
        onOk={handleBatchSubmit}
        onCancel={handleBatchCancel}
        confirmLoading={submitLoading}
        width={600}
        okText="确定"
        cancelText="取消"
      >
        {batchOperationType === 'delete' ? (
          <div>
            <p>确定要删除以下 {selectedRowKeys.length} 个物资吗？</p>
            <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #d9d9d9', padding: 8, borderRadius: 4 }}>
              {selectedRows.map(item => (
                <div key={item.id} style={{ padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
                  {item.supply_name} - {item.storage_location}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: 16, color: '#666' }}>
              将对选中的 {selectedRowKeys.length} 个物资进行批量更新。只填写需要更新的字段，未填写的字段将保持原值。
            </p>
            <Form
              form={batchForm}
              layout="vertical"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="supply_name"
                    label="物资名称"
                  >
                    <Input placeholder="留空则不更新" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="storage_location"
                    label="存储位置"
                  >
                    <Input placeholder="留空则不更新" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="production_date"
                    label="生产日期"
                  >
                    <DatePicker 
                      style={{ width: '100%' }} 
                      placeholder="留空则不更新"
                      format="YYYY-MM-DD"
                      allowClear
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="validity_period_days"
                    label="有效期(天)"
                  >
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="留空则不更新" 
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="supply_number"
                    label="编号"
                  >
                    <Input 
                      type="number" 
                      min="0" 
                      placeholder="留空则不更新" 
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default Supplies;