import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Form, Input, Spin, DatePicker } from 'antd';
import moment from 'moment';
import axios from 'axios';
import { message } from 'antd';
import { ColumnsType } from 'antd/es/table';

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

  useEffect(() => {
    const fetchSupplies = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/supplies', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSupplies(response.data.data);
      } catch (error) {
        message.error('获取物资列表失败');
        console.error('Error fetching supplies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplies();
  }, []);

  const handleClearFilters = () => {
    form.resetFields();
    setSearchParams({});
    setSorting({ field: 'id', order: 'ascend' });
    setCurrentPage(1);
  };

  const handleExpiredSupplies = () => {
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

  useEffect(() => {
    let filtered: Supply[] = [...supplies];
    
    const { supply_name, storage_location, production_date, expiration_start, expiration_end } = searchParams;
    if (supply_name) {
      filtered = filtered.filter(sup => 
        sup.supply_name.toLowerCase().includes(supply_name.toLowerCase())
      );
    }
    if (storage_location) {
      filtered = filtered.filter(sup => 
        storage_location ? sup.storage_location.toLowerCase().includes(storage_location.toLowerCase()) : true
      );
    }
    if (production_date) {
      filtered = filtered.filter(sup => sup.production_date === production_date);
    }
    if (expiration_start || expiration_end) {
      filtered = filtered.filter(sup => {
        if (!sup.production_date || sup.validity_period_days === undefined) return false;
        const productionDate = new Date(sup.production_date);
        if (isNaN(productionDate.getTime())) return false;
        const validityDays = Number(sup.validity_period_days);
        if (isNaN(validityDays) || validityDays <= 0) return false;
        const expirationDate = new Date(productionDate);
        expirationDate.setDate(productionDate.getDate() + validityDays);
        const expDateStr = expirationDate.toISOString().split('T')[0];
        
        const startMatch = expiration_start ? expDateStr >= expiration_start : true;
        const endMatch = expiration_end ? expDateStr <= expiration_end : true;
        return startMatch && endMatch;
      });
    }

    filtered.sort((a, b) => {
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
        const getExpirationDate = (sup: Supply) => {
          if (!sup.production_date || sup.validity_period_days === undefined) return 0;
          const productionDate = new Date(sup.production_date);
          if (isNaN(productionDate.getTime())) return 0;
          const validityDays = Number(sup.validity_period_days);
          if (isNaN(validityDays) || validityDays <= 0) return 0;
          const expirationDate = new Date(productionDate);
          expirationDate.setDate(productionDate.getDate() + validityDays);
          return expirationDate.getTime();
        };
        const dateA = getExpirationDate(a);
        const dateB = getExpirationDate(b);
        return sorting.order === 'ascend' ? dateA - dateB : dateB - dateA;
      }
      return sorting.order === 'ascend' ? a.id - b.id : b.id - a.id;
    });

    setSortedAndFiltered(filtered);
    setTotal(filtered.length);
  }, [supplies, searchParams, sorting]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = sortedAndFiltered.slice(startIndex, endIndex);
    setDisplaySupplies(currentPageData);
  }, [sortedAndFiltered, currentPage, pageSize]);

  const columns: ColumnsType<Supply> = [
    { title: '序号', key: 'index', align: 'center', render: (_, __, index) => `${(currentPage - 1) * pageSize + index + 1}` },
    { 
      title: '物资名称', 
      dataIndex: 'supply_name', 
      key: 'supply_name', 
      align: 'center',
      sorter: (a, b) => a.supply_name.localeCompare(b.supply_name) 
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
      dataIndex: 'supply_number', 
      key: 'supply_number', 
      align: 'center',
      sorter: (a, b) => a.supply_number - b.supply_number 
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
      render: (_: any, record: Supply) => {
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
        const getExpirationTimestamp = (sup: Supply) => {
          if (!sup.production_date || sup.validity_period_days === undefined) return 0;
          const productionDate = new Date(sup.production_date);
          if (isNaN(productionDate.getTime())) return 0;
          const validityDays = Number(sup.validity_period_days);
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
    <Card title={`符合条件的物资数量：${total}`} extra={<Button type="primary">添加物资</Button>}>
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
    </Card>
  );
};

export default Supplies;