import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, Button, Spin, Space, Modal, Select, Popconfirm, Row, Col, message, DatePicker, Drawer } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HistoryOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../config/axios';
import dayjs from 'dayjs';
import { API_ENDPOINTS } from '../config/api';
import { useNavigate } from 'react-router-dom';
import ImportExportButtons from '../components/ImportExportButtons';
import CollapsibleFilter from '../components/CollapsibleFilter';

const { Option } = Select;

interface Employee {
  id: number;
  name: string;
  employee_number: string;
  gender: string;
  workshop: string;
  position: string;
  hire_date: string;
  status: string;
  birth_date: string;
  work_start_date: string;
  original_company: string;
  total_exposure_time: number;
  pre_hire_exposure_time: number;
  id_number: string;
}

interface SearchParams {
  name?: string;
  employee_number?: string;
  workshop?: string;
  gender?: string;
  position?: string;
  status?: string;
}

interface ApiResponse {
  success: boolean;
  data: Employee[];
  total: number;
}

const Employees: React.FC = () => {
  const navigate = useNavigate();
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

  // 模态框状态
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);

  // 初始化表单实例
  const [form] = Form.useForm();
  const [modalForm] = Form.useForm();
  
  // 总接害时间计算状态
  const [calculatedExposureTime, setCalculatedExposureTime] = useState<number | null>(null);
  const [isExposureTimeLocked, setIsExposureTimeLocked] = useState<boolean>(false);

  // 计算总接害时间
  const calculateTotalExposureTime = (hireDate: any, workStartDate: any, preHireExposureTime: number | null, currentStatus: string) => {
    // 如果员工状态为非在职，不进行计算
    if (currentStatus && currentStatus !== '在职') {
      return null;
    }

    let totalTime = 0;
    
    // 添加入职前接害时间
    if (preHireExposureTime && preHireExposureTime > 0) {
      totalTime += preHireExposureTime;
    }
    
    // 计算入职后接害时间
    if (hireDate && workStartDate) {
      const hire = dayjs(hireDate);
      const workStart = dayjs(workStartDate);
      const now = dayjs();
      
      // 使用较晚的日期作为接害开始时间
      const exposureStartDate = hire.isAfter(workStart) ? hire : workStart;
      
      // 计算从接害开始到现在的年数
      const yearsWorked = now.diff(exposureStartDate, 'year', true);
      
      if (yearsWorked > 0) {
        totalTime += yearsWorked;
      }
    }
    
    return totalTime > 0 ? totalTime : null;
  };

  // 加载员工数据
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse>(API_ENDPOINTS.EMPLOYEES);
      setEmployees(response.data.data);
    } catch (error) {
      message.error('获取员工列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // 监听表单字段变化，实时计算总接害时间
  useEffect(() => {
    if (!isModalVisible) return;

    const subscription = modalForm.getFieldsValue();
    const { hire_date, work_start_date, pre_hire_exposure_time, status } = subscription;
    
    // 检查状态变化
    const currentStatus = status || '在职';
    const shouldLock = currentStatus !== '在职';
    
    if (shouldLock !== isExposureTimeLocked) {
      setIsExposureTimeLocked(shouldLock);
      
      // 如果状态变为非在职，锁定当前值
      if (shouldLock && editingEmployee) {
        setCalculatedExposureTime(editingEmployee.total_exposure_time || null);
        return;
      }
    }
    
    // 如果状态为非在职，不进行计算
    if (shouldLock) {
      return;
    }
    
    // 计算总接害时间
    const calculated = calculateTotalExposureTime(
      hire_date,
      work_start_date,
      pre_hire_exposure_time,
      currentStatus
    );
    
    setCalculatedExposureTime(calculated);
  }, [isModalVisible, modalForm, isExposureTimeLocked, editingEmployee]);

  // 监听表单字段变化
  const handleFormValuesChange = () => {
    if (!isModalVisible) return;

    const values = modalForm.getFieldsValue();
    const { hire_date, work_start_date, pre_hire_exposure_time, status } = values;
    
    // 检查状态变化
    const currentStatus = status || '在职';
    const shouldLock = currentStatus !== '在职';
    
    if (shouldLock !== isExposureTimeLocked) {
      setIsExposureTimeLocked(shouldLock);
      
      // 如果状态变为非在职，锁定当前值
      if (shouldLock && editingEmployee) {
        setCalculatedExposureTime(editingEmployee.total_exposure_time || null);
        return;
      }
    }
    
    // 如果状态为非在职，不进行计算
    if (shouldLock) {
      return;
    }
    
    // 计算总接害时间
    const calculated = calculateTotalExposureTime(
      hire_date,
      work_start_date,
      pre_hire_exposure_time,
      currentStatus
    );
    
    setCalculatedExposureTime(calculated);
  };

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

  // 打开添加员工模态框
  const handleViewDetail = (employee: Employee) => {
    setDetailEmployee(employee);
    setIsDetailDrawerVisible(true);
  };

  const handleCloseDetailDrawer = () => {
    setIsDetailDrawerVisible(false);
    setDetailEmployee(null);
  };

  const handleAddEmployee = () => {
    setModalType('add');
    setEditingEmployee(null);
    modalForm.resetFields();
    setCalculatedExposureTime(null);
    setIsExposureTimeLocked(false);
    setIsModalVisible(true);
  };

  // 打开编辑员工模态框
  const handleEditEmployee = (employee: Employee) => {
    setModalType('edit');
    setEditingEmployee(employee);
    
    // 检查员工状态，如果非在职则锁定总接害时间
    const isLocked = Boolean(employee.status && employee.status !== '在职');
    setIsExposureTimeLocked(isLocked);
    
    // 如果是在职状态，计算总接害时间
    if (!isLocked) {
      const calculated = calculateTotalExposureTime(
        employee.hire_date,
        employee.work_start_date,
        employee.pre_hire_exposure_time,
        employee.status || '在职'
      );
      setCalculatedExposureTime(calculated);
    } else {
      setCalculatedExposureTime(employee.total_exposure_time || null);
    }
    
    modalForm.setFieldsValue({
      ...employee,
      birth_date: employee.birth_date ? dayjs(employee.birth_date) : null,
      hire_date: employee.hire_date ? dayjs(employee.hire_date) : null,
      work_start_date: employee.work_start_date ? dayjs(employee.work_start_date) : null,
    });
    setIsModalVisible(true);
  };

  // 删除员工
  const handleDeleteEmployee = async (id: number) => {
    try {
      await apiClient.delete(`${API_ENDPOINTS.EMPLOYEES}/${id}`);
      message.success('删除员工成功');
      fetchEmployees(); // 重新获取数据
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
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
        hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null,
        work_start_date: values.work_start_date ? values.work_start_date.format('YYYY-MM-DD') : null,
      };

      // 使用计算的总接害时间或锁定的值
      if (calculatedExposureTime !== null) {
        formattedValues.total_exposure_time = calculatedExposureTime;
      }

      if (modalType === 'add') {
        await apiClient.post(API_ENDPOINTS.EMPLOYEES, formattedValues);
        message.success('添加员工成功');
      } else {
        await apiClient.put(`${API_ENDPOINTS.EMPLOYEES}/${editingEmployee?.id}`, formattedValues);
        message.success('更新员工信息成功');
      }
      
      setIsModalVisible(false);
      modalForm.resetFields();
      setCalculatedExposureTime(null);
      setIsExposureTimeLocked(false);
      fetchEmployees(); // 重新获取数据
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
    setEditingEmployee(null);
    setCalculatedExposureTime(null);
    setIsExposureTimeLocked(false);
  };

  // 筛选和排序逻辑
  useEffect(() => {
    let filtered: Employee[] = [...employees];
    
    // 应用筛选条件
    const { name, employee_number, workshop, gender, position, status } = searchParams;
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
    if (status) {
      filtered = filtered.filter(emp => 
        (emp.status || '在职') === status
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
      title: '出生日期', 
      dataIndex: 'birth_date', 
      key: 'birth_date', 
      align: 'center',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.birth_date || 0).getTime() - new Date(b.birth_date || 0).getTime()
    },
    { 
      title: '入职时间', 
      dataIndex: 'hire_date', 
      key: 'hire_date', 
      align: 'center',
      render: (date: string) => date ? new Date(date).toLocaleDateString() : '-',
      sorter: (a, b) => new Date(a.hire_date || 0).getTime() - new Date(b.hire_date || 0).getTime()
    },
    { 
      title: '总接害时间(年)', 
      dataIndex: 'total_exposure_time', 
      key: 'total_exposure_time', 
      align: 'center',
      render: (value: number) => {
        if (value === undefined) return '-';
        // 将值只舍不入到0.5的倍数：不满0.5年的舍去，如1.3年显示为1年，1.7年显示为1.5年
        const roundedValue = Math.floor(value * 2) / 2; // 使用Math.floor代替Math.round实现只舍不入
        return roundedValue.toFixed(roundedValue % 1 === 0 ? 0 : 1);
      },
      sorter: (a, b) => (a.total_exposure_time || 0) - (b.total_exposure_time || 0)
    },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      align: 'center',
      render: (status: string) => {
        const statusColors: { [key: string]: string } = {
          '在职': 'green',
          '离职': 'red',
          '调岗': 'orange',
          '休假': 'blue',
          '停职': 'gray'
        };
        return (
          <span style={{ 
            color: statusColors[status] || 'black',
            fontWeight: 'bold'
          }}>
            {status || '在职'}
          </span>
        );
      },
      sorter: (a, b) => (a.status || '在职').localeCompare(b.status || '在职')
    },
    { 
      title: '操作', 
      key: 'action', 
      render: (record: Employee) => (
        <Space size="middle">
          <Button 
            type="default" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record)}
          >
            查看详细
          </Button>
          <Button 
            type="primary" 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => handleEditEmployee(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个员工吗？"
            onConfirm={() => handleDeleteEmployee(record.id)}
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
      title={`符合条件的员工： ${total} `} 
      extra={
        <Space>
          <ImportExportButtons 
            dataType="employee"
            exportData={displayEmployees}
            fullData={employees}
            onImportSuccess={fetchEmployees}
            fileNamePrefix="员工信息"
            requiredFields={['姓名', '工号', '性别', '车间', '职位']}
          />
          <Button 
            type="default" 
            icon={<HistoryOutlined />}
            onClick={() => navigate('/employees/operation-records')}
          >
            操作记录
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddEmployee}
          >
            添加员工
          </Button>
        </Space>
      }
    >
      <CollapsibleFilter
        form={form}
        onValuesChange={handleSearch}
        onClear={handleClearFilters}
        maxVisibleItems={3}
      >
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
        <Form.Item name="status" label="状态">
          <Select placeholder="请选择状态" allowClear>
            <Option value="在职">在职</Option>
            <Option value="离职">离职</Option>
            <Option value="调岗">调岗</Option>
            <Option value="休假">休假</Option>
            <Option value="停职">停职</Option>
          </Select>
        </Form.Item>
      </CollapsibleFilter>
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

      {/* 添加/编辑员工模态框 */}
      <Modal
        title={modalType === 'add' ? '添加员工' : '编辑员工'}
        open={isModalVisible}
        onOk={() => modalForm.submit()}
        onCancel={handleCancel}
        confirmLoading={submitLoading}
        width={800}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={modalForm}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleFormValuesChange}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="employee_number"
                label="工号"
                rules={[{ required: true, message: '请输入工号' }]}
              >
                <Input placeholder="请输入工号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="gender"
                label="性别"
                rules={[{ required: true, message: '请选择性别' }]}
              >
                <Select placeholder="请选择性别">
                  <Select.Option value="男">男</Select.Option>
                  <Select.Option value="女">女</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="workshop"
                label="车间"
                rules={[{ required: true, message: '请输入车间' }]}
              >
                <Input placeholder="请输入车间" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="position"
                label="职位"
                rules={[{ required: true, message: '请输入职位' }]}
              >
                <Input placeholder="请输入职位" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="birth_date"
                label="出生日期"
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  placeholder="请选择出生日期"
                  format="YYYY-MM-DD"
                  changeOnBlur
                  allowClear
                  showToday={false}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="hire_date"
                label="入职时间"
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  placeholder="请选择入职时间"
                  format="YYYY-MM-DD"
                  changeOnBlur
                  allowClear
                  showToday={false}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="work_start_date"
                label="参加工作时间"
              >
                <DatePicker 
                  style={{ width: '100%' }} 
                  placeholder="请选择参加工作时间"
                  format="YYYY-MM-DD"
                  changeOnBlur
                  allowClear
                  showToday={false}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="original_company"
                label="原单位"
              >
                <Input placeholder="请输入原单位" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="id_number"
                label="身份证号"
              >
                <Input placeholder="请输入身份证号" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="total_exposure_time"
                label="总接害时间(年)"
                help={
                  isExposureTimeLocked 
                    ? "员工状态为非在职，总接害时间已锁定" 
                    : calculatedExposureTime !== null 
                      ? "系统自动计算，基于入职时间、参加工作时间和入职前接害时间"
                      : "请填写入职时间、参加工作时间等信息，系统将自动计算"
                }
              >
                <Input 
                  value={
                    calculatedExposureTime !== null 
                      ? (() => {
                          const roundedValue = Math.floor(calculatedExposureTime * 2) / 2;
                          return roundedValue.toFixed(roundedValue % 1 === 0 ? 0 : 1);
                        })()
                      : ''
                  }
                  placeholder={
                    isExposureTimeLocked 
                      ? "已锁定" 
                      : "系统自动计算"
                  }
                  readOnly
                  style={{ 
                    backgroundColor: isExposureTimeLocked ? '#f5f5f5' : '#fafafa',
                    cursor: 'not-allowed'
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="pre_hire_exposure_time"
                label="入职前接害时间(年)"
              >
                <Input 
                  type="number" 
                  step="0.5" 
                  min="0" 
                  placeholder="请输入入职前接害时间" 
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="状态"
                rules={[{ required: true, message: '请选择状态' }]}
                initialValue="在职"
              >
                <Select placeholder="请选择状态">
                  <Option value="在职">在职</Option>
                  <Option value="离职">离职</Option>
                  <Option value="调岗">调岗</Option>
                  <Option value="休假">休假</Option>
                  <Option value="停职">停职</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 员工详细信息抽屉 */}
      <Drawer
        title="员工详细信息"
        placement="right"
        onClose={handleCloseDetailDrawer}
        open={isDetailDrawerVisible}
        width={600}
      >
        {detailEmployee && (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>姓名：</strong>
                  <span>{detailEmployee.name}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>工号：</strong>
                  <span>{detailEmployee.employee_number}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>性别：</strong>
                  <span>{detailEmployee.gender}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>车间：</strong>
                  <span>{detailEmployee.workshop}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>职位：</strong>
                  <span>{detailEmployee.position}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>出生日期：</strong>
                  <span>{detailEmployee.birth_date ? new Date(detailEmployee.birth_date).toLocaleDateString() : '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>入职时间：</strong>
                  <span>{detailEmployee.hire_date ? new Date(detailEmployee.hire_date).toLocaleDateString() : '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>参加工作时间：</strong>
                  <span>{detailEmployee.work_start_date ? new Date(detailEmployee.work_start_date).toLocaleDateString() : '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>原单位：</strong>
                  <span>{detailEmployee.original_company || '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>总接害时间(年)：</strong>
                  <span>
                    {detailEmployee.total_exposure_time !== undefined 
                      ? (() => {
                          const roundedValue = Math.floor(detailEmployee.total_exposure_time * 2) / 2;
                          return roundedValue.toFixed(roundedValue % 1 === 0 ? 0 : 1);
                        })()
                      : '-'
                    }
                  </span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>入职前接害时间(年)：</strong>
                  <span>
                    {detailEmployee.pre_hire_exposure_time !== undefined 
                      ? (() => {
                          const roundedValue = Math.floor(detailEmployee.pre_hire_exposure_time * 2) / 2;
                          return roundedValue.toFixed(roundedValue % 1 === 0 ? 0 : 1);
                        })()
                      : '-'
                    }
                  </span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>身份证号：</strong>
                  <span>{detailEmployee.id_number || '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>状态：</strong>
                  <span style={{
                    color: detailEmployee.status === '在职' ? '#52c41a' : 
                           detailEmployee.status === '离职' ? '#ff4d4f' :
                           detailEmployee.status === '调岗' ? '#1890ff' :
                           detailEmployee.status === '休假' ? '#faad14' :
                           detailEmployee.status === '停职' ? '#f5222d' : '#666'
                  }}>
                    {detailEmployee.status || '在职'}
                  </span>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default Employees;