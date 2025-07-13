import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Spin, message, Card, Form, Input } from 'antd';
import axios from 'axios';
import { ColumnsType } from 'antd/es/table';

interface Employee {
  id: number;
  name: string;
  employee_number: string;
  gender: string;
  workshop: string;
  position: string;
  hire_date: string;
  status: string;
}

interface SearchParams {
  name?: string;
  employee_number?: string;
  workshop?: string;
  gender?: string;
  position?: string;
}

interface ApiResponse {
  success: boolean;
  data: Employee[];
  total: number;
}

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [displayEmployees, setDisplayEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [searchParams, setSearchParams] = useState<SearchParams>({});
  const [total, setTotal] = useState<number>(0);
  // 排序状态
  const [sorting, setSorting] = useState({
    field: 'id',
    order: 'ascend' as 'ascend' | 'descend' | null
  });

  // 初始化表单实例
  const [form] = Form.useForm();

  // 加载员工数据
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const response = await axios.get<ApiResponse>('/api/employees');
        setEmployees(response.data.data);
      } catch (error) {
        message.error('获取员工信息失败，请重试');
        console.error('Error fetching employees:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  // 处理搜索
  const handleSearch = (values: SearchParams) => {
    setSearchParams(values);
    setCurrentPage(1);
  };

  // 处理表格排序、分页变化
  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    if (sorter.field || sorter.order) {
      setSorting({
        field: sorter.field || 'id',
        order: sorter.order || 'ascend'
      });
    }
    setCurrentPage(pagination.current);
    setPageSize(pagination.pageSize);
  };

  // 清空所有筛选条件
  const handleClearFilters = () => {
    form.resetFields(); // 重置表单字段
    setSearchParams({}); // 清空搜索参数
    setCurrentPage(1); // 重置到第一页
    setSorting({ field: 'id', order: 'ascend' }); // 重置排序
  };

  // 筛选和排序逻辑
  useEffect(() => {
    let filtered: Employee[] = [...employees];
    
    // 应用筛选条件
    const { name, employee_number, workshop, gender, position } = searchParams;
    if (name) {
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    if (employee_number) {
      filtered = filtered.filter(emp => 
        emp.employee_number.includes(employee_number)
      );
    }
    if (workshop) {
      filtered = filtered.filter(emp => 
        emp.workshop.toLowerCase().includes(workshop.toLowerCase())
      );
    }
    if (gender) {
      filtered = filtered.filter(emp => 
        emp.gender.toLowerCase().includes(gender.toLowerCase())
      );
    }
    if (position) {
      filtered = filtered.filter(emp => 
        emp.position.toLowerCase().includes(position.toLowerCase())
      );
    }
    
    // 应用排序
    if (sorting.field && sorting.order) {
      filtered.sort((a, b) => {
        const field = sorting.field as keyof Employee;
        
        if (typeof a[field] === 'string' && typeof b[field] === 'string') {
          return sorting.order === 'ascend'
            ? (a[field] as string).localeCompare(b[field] as string)
            : (b[field] as string).localeCompare(a[field] as string);
        }
        
        if (typeof a[field] === 'number' && typeof b[field] === 'number') {
          return sorting.order === 'ascend'
            ? (a[field] as number) - (b[field] as number)
            : (b[field] as number) - (a[field] as number);
        }
        
        // 默认按id排序
        return sorting.order === 'ascend' ? a.id - b.id : b.id - a.id;
      });
    }
    
    // 计算总数
    setTotal(filtered.length);
    
    // 应用分页
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    setDisplayEmployees(filtered.slice(start, end));
  }, [employees, searchParams, currentPage, pageSize, sorting]);

  // 表格列定义
  const columns: ColumnsType<Employee> = [
    { 
      title: '序号', 
      key: 'index', 
      render: (_: any, __: Employee, index: number) => index + 1,
      align: 'center'
    },
    { 
      title: '姓名', 
      dataIndex: 'name', 
      key: 'name', 
      align: 'center',
      sorter: (a, b) => a.name.localeCompare(b.name)
    },
    { 
      title: '工号', 
      dataIndex: 'employee_number', 
      key: 'employee_number', 
      align: 'center',
      sorter: (a, b) => a.employee_number.localeCompare(b.employee_number)
    },
    { 
      title: '性别', 
      dataIndex: 'gender', 
      key: 'gender', 
      align: 'center',
      sorter: (a, b) => a.gender.localeCompare(b.gender)
    },
    { 
      title: '车间', 
      dataIndex: 'workshop', 
      key: 'workshop', 
      align: 'center',
      sorter: (a, b) => a.workshop.localeCompare(b.workshop)
    },
    { 
      title: '职位', 
      dataIndex: 'position', 
      key: 'position', 
      align: 'center',
      sorter: (a, b) => a.position.localeCompare(b.position)
    },
    { 
      title: '操作', 
      key: 'action', 
      render: (record: Employee) => (
        <Space size="middle">
          <Button type="primary" size="small">编辑</Button>
          <Button danger size="small">删除</Button>
        </Space>
      ),
      align: 'center'
    },
  ];

  return (
    <Card title={`符合条件的员工： ${total} `} extra={<Button type="primary">添加员工</Button>}>
      <Form<SearchParams> 
        form={form} // 关联表单实例
        onValuesChange={handleSearch} 
        layout="inline" 
        style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-end', gap: 16, width: '100%', flexWrap: 'wrap' }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Form.Item name="name" label="姓名">
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item name="employee_number" label="工号">
            <Input placeholder="请输入工号" />
          </Form.Item>
          <Form.Item name="workshop" label="车间">
            <Input placeholder="请输入车间" />
          </Form.Item>
          <Form.Item name="gender" label="性别">
            <Input placeholder="请输入性别" />
          </Form.Item>
          <Form.Item name="position" label="职位">
            <Input placeholder="请输入职位" />
          </Form.Item>
        </div>
        <Space style={{ marginLeft: 'auto' }}>
          <Button type="default" onClick={handleClearFilters}>
            清空筛选条件
          </Button>
          <Form.Item style={{ display: 'none' }}>
            <Button type="primary" htmlType="submit">查询</Button>
          </Form.Item>
        </Space>
      </Form>
      <Spin spinning={loading} tip="加载中...">
        <Table 
          dataSource={displayEmployees} 
          columns={columns} 
          rowKey="id" 
          pagination={{ 
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            pageSizeOptions: ['10', '20', '50'],
            onChange: (page, pageSize) => {
              setCurrentPage(page);
              setPageSize(pageSize);
            }
          }} 
          onChange={handleTableChange} 
        />
      </Spin>
    </Card>
  );
};

export default Employees;