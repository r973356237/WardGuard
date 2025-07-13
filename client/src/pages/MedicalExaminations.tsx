import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Form, Input, DatePicker, message } from 'antd';
import { ColumnsType } from 'antd/es/table';
import axios from 'axios';
import moment from 'moment';

interface MedicalExamination {
  id: number;
  employee_name: string;
  examination_date: string;
  audiometry_result: string;
  dust_examination_result: string;
  need_recheck: number; // 数据库中为0/1（0=不需要，1=需要）
  recheck_date: string | null;
  audiometry_recheck_result: string | null;
  dust_recheck_result: string | null;
}

const MedicalExaminations: React.FC = () => {
  const [form] = Form.useForm();
  const [examinations, setExaminations] = useState<MedicalExamination[]>([]);
  const [displayExaminations, setDisplayExaminations] = useState<MedicalExamination[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchParams, setSearchParams] = useState<{
    employee_name?: string;
    examination_date?: string;
    audiometry_result?: string;
    dust_examination_result?: string;
    need_recheck?: number; // 用于存储异常筛选条件（1=需要复查）
  }>({});
  const [total, setTotal] = useState<number>(0);
  const [sortedAndFiltered, setSortedAndFiltered] = useState<MedicalExamination[]>([]);
  // 排序状态：用户未主动排序时按员工姓名分组，否则按用户选择的列排序
  const [sorting, setSorting] = useState({ 
    field: 'employee_name', 
    order: 'ascend' as 'ascend' | 'descend' | null,
    userInitiated: false // 标记是否为用户主动排序
  });

  // 处理表格排序、分页变化
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    if (sorter.field || sorter.order) {
      setSorting({
        field: sorter.field || 'id',
        order: sorter.order || 'ascend',
        userInitiated: true // 用户主动点击排序
      });
      setCurrentPage(1);
    }
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // 初始化加载体检记录
  useEffect(() => {
    const fetchExaminations = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/medical-examinations', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setExaminations(response.data.data);
      } catch (error) {
        message.error('获取体检记录失败');
        console.error('Error fetching examinations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExaminations();
  }, []);

  // 清空所有筛选条件
  const handleClearFilters = () => {
    form.resetFields();
    setSearchParams({});
    // 重置排序为默认状态（按员工姓名分组）
    setSorting({
      field: 'employee_name',
      order: 'ascend',
      userInitiated: false
    });
    setCurrentPage(1);
  };

  // 执行普通搜索筛选
  const handleSearch = (values: typeof searchParams) => {
    setSearchParams(values);
    setCurrentPage(1);
  };

  // 筛选异常记录
  const handleFilterAbnormalRecords = () => {
    setSearchParams(prev => ({ ...prev, need_recheck: 1 }));
    setCurrentPage(1);
  };

  // 处理筛选和排序逻辑（核心修改）
  useEffect(() => {
    let filtered: MedicalExamination[] = [...examinations];

    // 应用筛选条件
    const { 
      employee_name, 
      examination_date, 
      audiometry_result, 
      dust_examination_result,
      need_recheck 
    } = searchParams;

    if (employee_name) {
      filtered = filtered.filter(exam => 
        (exam.employee_name || '').toLowerCase().includes(employee_name.toLowerCase())
      );
    }

    if (examination_date) {
      filtered = filtered.filter(exam => 
        moment(exam.examination_date).format('YYYY-MM-DD') === examination_date
      );
    }

    if (audiometry_result) {
      filtered = filtered.filter(exam => 
        (exam.audiometry_result || '').toLowerCase().includes(audiometry_result.toLowerCase())
      );
    }

    if (dust_examination_result) {
      filtered = filtered.filter(exam => 
        (exam.dust_examination_result || '').toLowerCase().includes(dust_examination_result.toLowerCase())
      );
    }

    if (need_recheck === 1) {
      filtered = filtered.filter(exam => exam.need_recheck === 1);
    }

    // 处理排序（核心修改：用户主动排序时不再按姓名分组）
    if (sorting.field && sorting.order) {
      filtered.sort((a, b) => {
        const field = sorting.field as keyof MedicalExamination;
        
        // 处理不同类型字段的排序逻辑
        if (['employee_name', 'audiometry_result', 'dust_examination_result'].includes(field)) {
          const valueA = (a[field] as string) || '';
          const valueB = (b[field] as string) || '';
          return sorting.order === 'ascend' 
            ? valueA.localeCompare(valueB) 
            : valueB.localeCompare(valueA);
        }
        
        if (['examination_date', 'recheck_date'].includes(field)) {
          const dateA = a[field] ? new Date(a[field] as string).getTime() : 0;
          const dateB = b[field] ? new Date(b[field] as string).getTime() : 0;
          return sorting.order === 'ascend' ? dateA - dateB : dateB - dateA;
        }
        
        if (field === 'need_recheck') {
          return sorting.order === 'ascend' 
            ? a.need_recheck - b.need_recheck 
            : b.need_recheck - a.need_recheck;
        }
        
        // 处理其他可能的字段（如id）
        if (typeof a[field] === 'number' && typeof b[field] === 'number') {
          return sorting.order === 'ascend' 
            ? (a[field] as number) - (b[field] as number) 
            : (b[field] as number) - (a[field] as number);
        }
        
        // 默认按id排序
        return sorting.order === 'ascend' 
          ? a.id - b.id 
          : b.id - a.id;
      });
    }

    setSortedAndFiltered(filtered);
    setTotal(filtered.length);
  }, [examinations, searchParams, sorting]);

  // 处理分页逻辑
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setDisplayExaminations(sortedAndFiltered.slice(startIndex, endIndex));
  }, [sortedAndFiltered, currentPage, pageSize]);

  // 表格列定义
  const columns: ColumnsType<MedicalExamination> = [
    {
      title: '序号',
      key: 'index',
      align: 'center',
      width: 60,
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1
    },
    { 
      title: '员工姓名', 
      dataIndex: 'employee_name', 
      key: 'employee_name', 
      align: 'center',
      sorter: true,
      defaultSortOrder: 'ascend' // 默认按员工姓名升序
    },
    {
      title: '体检日期',
      dataIndex: 'examination_date',
      key: 'examination_date',
      align: 'center',
      sorter: true,
      render: (date: string | undefined) => {
        if (!date) return '-';
        return moment(date).format('YYYY/MM/DD');
      }
    },
    { 
      title: '电测听结果', 
      dataIndex: 'audiometry_result', 
      key: 'audiometry_result', 
      align: 'center',
      sorter: true
    },
    { 
      title: '粉尘结果', 
      dataIndex: 'dust_examination_result', 
      key: 'dust_examination_result', 
      align: 'center',
      sorter: true
    },
    { 
      title: '是否需要复查', 
      dataIndex: 'need_recheck', 
      key: 'need_recheck', 
      align: 'center',
      sorter: true,
      render: (value: number) => value === 1 ? '是' : '否'
    },
    {
      title: '复查时间',
      dataIndex: 'recheck_date',
      key: 'recheck_date',
      align: 'center',
      sorter: true,
      render: (date: string | null | undefined) => {
        if (!date) return '-';
        return moment(date).format('YYYY/MM/DD');
      }
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      render: () => (
        <Space size="middle">
          <Button type="primary" size="small">查看详情</Button>
          <Button danger size="small">删除</Button>
        </Space>
      )
    },
  ];

  return (
    <Card 
      title={`符合条件的体检记录数量：${total}`} 
      extra={<Button type="primary">添加体检记录</Button>}
    >
      <Form<typeof searchParams> 
        form={form} 
        onValuesChange={handleSearch} 
        layout="inline" 
        style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', flexWrap: 'wrap' }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Form.Item name="employee_name" label="员工姓名">
            <Input placeholder="请输入员工姓名" />
          </Form.Item>
          <Form.Item name="examination_date" label="体检日期">
            <DatePicker 
              format="YYYY-MM-DD" 
              onChange={date => date && setSearchParams(prev => ({
                ...prev, 
                examination_date: date.format('YYYY-MM-DD')
              }))} 
            />
          </Form.Item>
          <Form.Item name="audiometry_result" label="电测听结果">
            <Input placeholder="请输入电测听结果" />
          </Form.Item>
          <Form.Item name="dust_examination_result" label="粉尘结果">
            <Input placeholder="请输入粉尘结果" />
          </Form.Item>
        </div>
        <Space style={{ marginLeft: 'auto' }}>
          <Button type="default" onClick={handleClearFilters}>
            清空筛选条件
          </Button>
          <Button type="primary" onClick={handleFilterAbnormalRecords}>
            筛选异常记录
          </Button>
        </Space>
      </Form>

      <Table 
        dataSource={displayExaminations} 
        columns={columns} 
        rowKey="id" 
        loading={loading} 
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
    </Card>
  );
};

export default MedicalExaminations;