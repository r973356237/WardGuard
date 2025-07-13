import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Form, Input, Spin, DatePicker } from 'antd';
import moment from 'moment';
import axios from 'axios';
import { message } from 'antd';
import { ColumnsType } from 'antd/es/table';

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

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/medicines', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMedicines(response.data.data);
      } catch (error) {
        message.error('获取药品列表失败');
        console.error('Error fetching medicines:', error);
      } finally {
        setLoading(false);
      }
    };

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
        if (!med.production_date || med.validity_period_days === undefined) return false;
        const productionDate = new Date(med.production_date);
        if (isNaN(productionDate.getTime())) return false;
        const validityDays = Number(med.validity_period_days);
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
      sorter: (a, b) => a.medicine_name.localeCompare(b.medicine_name) 
    },
    { 
      title: '存储位置', 
      dataIndex: 'storage_location', 
      key: 'storage_location', 
      align: 'center',
      sorter: (a, b) => a.storage_location.localeCompare(b.storage_location) 
    },
    { 
      title: '生产日期', 
      dataIndex: 'production_date', 
      key: 'production_date', 
      render: (date: string | null) => date ? new Date(date).toLocaleDateString() : '-', 
      align: 'center',
      sorter: (a, b) => new Date(a.production_date).getTime() - new Date(b.production_date).getTime() 
    },
    { 
      title: '库存数量', 
      dataIndex: 'quantity', 
      key: 'quantity', 
      align: 'center',
      sorter: (a, b) => a.quantity - b.quantity 
    },
    { 
      title: '有效期(天)', 
      dataIndex: 'validity_period_days', 
      key: 'validity_period_days', 
      align: 'center',
      sorter: (a, b) => a.validity_period_days - b.validity_period_days 
    },
    { 
      title: '过期时间', 
      key: 'expiration_date', 
      render: (_: any, record: Medicine) => {
        if (!record.production_date || record.validity_period_days === undefined) return '-';
        const productionDate = new Date(record.production_date);
        if (isNaN(productionDate.getTime())) return '无效日期';
        const validityDays = Number(record.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return '无效天数';
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
        return expirationDate.toLocaleDateString();
      }, 
      align: 'center',
      sorter: (a, b) => {
        const getExpirationTimestamp = (med: Medicine) => {
          if (!med.production_date || med.validity_period_days === undefined) return 0;
          const productionDate = new Date(med.production_date);
          if (isNaN(productionDate.getTime())) return 0;
          const validityDays = Number(med.validity_period_days);
          if (isNaN(validityDays) || validityDays <= 0) return 0;
          const expirationDate = new Date(productionDate);
          expirationDate.setDate(productionDate.getDate() + validityDays);
          return expirationDate.getTime();
        };
        return getExpirationTimestamp(a) - getExpirationTimestamp(b);
      }
    },
    { 
      title: '操作', 
      key: 'action', 
      render: () => (
        <Space size="middle">
          <Button type="primary" size="small">编辑</Button>
          <Button danger size="small">删除</Button>
        </Space>
      ),
      align: 'center'
    },
  ];

  return (
    <Card title={`符合条件的药品数量：${total}`} extra={<Button type="primary">添加药品</Button>}>
      <Form<typeof searchParams> form={form} onValuesChange={handleSearch} layout="inline" style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
          <Form.Item name="medicine_name" label="药品名称" >
            <Input placeholder="请输入药品名称" style={{ width: '100%' }} />
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
          <Button type="primary" onClick={handleExpiredMedicines}>查询已过期药品</Button>
        </div>
        <Form.Item style={{ display: 'none' }}>
          <Button type="primary" htmlType="submit">查询</Button>
        </Form.Item>
      </Form>
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
    </Card>
  );
};

export default Medicines;