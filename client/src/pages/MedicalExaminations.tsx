import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Input, DatePicker, Button, Space, Modal, Select, Popconfirm, Row, Col, message, Drawer } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, HistoryOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '../config/axios';
import dayjs from 'dayjs';
import { API_ENDPOINTS } from '../config/api';
import ImportExportButtons from '../components/ImportExportButtons';
import CollapsibleFilter from '../components/CollapsibleFilter';

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
  const navigate = useNavigate();
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

  // 模态框状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'add' | 'edit'>('add');
  const [editingExamination, setEditingExamination] = useState<MedicalExamination | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalForm] = Form.useForm();

  // 抽屉状态
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [detailExamination, setDetailExamination] = useState<MedicalExamination | null>(null);

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

  // 获取体检记录数据
  const fetchExaminations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.MEDICAL_EXAMINATIONS);
      if (response.data.success) {
        setExaminations(response.data.data);
      } else {
        message.error('获取体检记录失败');
      }
    } catch (error) {
      message.error('获取体检记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载体检记录
  useEffect(() => {
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

  // 执行普通搜索筛选（支持联合筛选）
  const handleSearch = (changedValues: any, allValues: typeof searchParams) => {
    setSearchParams(allValues);
    setCurrentPage(1);
  };

  // 筛选异常记录
  const handleFilterAbnormalRecords = () => {
    setSearchParams(prev => ({ ...prev, need_recheck: 1 }));
    setCurrentPage(1);
  };

  // 添加体检记录
  const handleAddExamination = () => {
    setModalType('add');
    setEditingExamination(null);
    modalForm.resetFields();
    setIsModalVisible(true);
  };

  // 编辑体检记录
  const handleEditExamination = (examination: MedicalExamination) => {
    setModalType('edit');
    setEditingExamination(examination);
    modalForm.setFieldsValue({
      ...examination,
      examination_date: examination.examination_date ? dayjs(examination.examination_date) : null,
      recheck_date: examination.recheck_date ? dayjs(examination.recheck_date) : null,
    });
    setIsModalVisible(true);
  };

  // 查看体检记录详情
  const handleViewExamination = (examination: MedicalExamination) => {
    setDetailExamination(examination);
    setIsDetailDrawerVisible(true);
  };

  // 关闭详情抽屉
  const handleCloseDetailDrawer = () => {
    setIsDetailDrawerVisible(false);
    setDetailExamination(null);
  };

  // 删除体检记录
  const handleDeleteExamination = async (id: number) => {
    try {
      const response = await apiClient.delete(`${API_ENDPOINTS.MEDICAL_EXAMINATIONS}/${id}`);
      if (response.data.success) {
        message.success('删除成功');
        fetchExaminations();
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
        examination_date: values.examination_date ? values.examination_date.format('YYYY-MM-DD') : null,
        recheck_date: values.recheck_date ? values.recheck_date.format('YYYY-MM-DD') : null,
      };

      let response;
      if (modalType === 'add') {
        response = await apiClient.post(API_ENDPOINTS.MEDICAL_EXAMINATIONS, formattedValues);
      } else {
        response = await apiClient.put(`${API_ENDPOINTS.MEDICAL_EXAMINATIONS}/${editingExamination?.id}`, formattedValues);
      }

      if (response && response.data.success) {
        message.success(modalType === 'add' ? '添加成功' : '更新成功');
        setIsModalVisible(false);
        fetchExaminations();
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
  };

  // 处理筛选和排序逻辑（支持联合筛选）
  useEffect(() => {
    let filtered: MedicalExamination[] = [...examinations];

    // 应用联合筛选条件（所有条件同时生效）
    const { 
      employee_name, 
      examination_date, 
      audiometry_result, 
      dust_examination_result,
      need_recheck 
    } = searchParams;

    // 员工姓名筛选
    if (employee_name && employee_name.trim()) {
      filtered = filtered.filter(exam => 
        (exam.employee_name || '').toLowerCase().includes(employee_name.toLowerCase().trim())
      );
    }

    // 体检日期筛选
    if (examination_date && examination_date.trim()) {
      filtered = filtered.filter(exam => 
        dayjs(exam.examination_date).format('YYYY-MM-DD') === examination_date
      );
    }

    // 电测听结果筛选
    if (audiometry_result && audiometry_result.trim()) {
      filtered = filtered.filter(exam => 
        (exam.audiometry_result || '').toLowerCase().includes(audiometry_result.toLowerCase().trim())
      );
    }

    // 粉尘结果筛选
    if (dust_examination_result && dust_examination_result.trim()) {
      filtered = filtered.filter(exam => 
        (exam.dust_examination_result || '').toLowerCase().includes(dust_examination_result.toLowerCase().trim())
      );
    }

    // 是否需要复查筛选
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
        return dayjs(date).format('YYYY/MM/DD');
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
      title: '操作',
      key: 'action',
      align: 'center',
      render: (_, record: MedicalExamination) => (
        <Space size="middle">
          <Button 
            type="default" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewExamination(record)}
          >
            查看详情
          </Button>
          <Button 
            type="primary" 
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditExamination(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这条体检记录吗？"
            onConfirm={() => handleDeleteExamination(record.id)}
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
      )
    },
  ];

  return (
    <Card 
      title={`符合条件的体检记录数量：${total}`} 
      extra={
        <Space>
          <ImportExportButtons 
            dataType="medicalExamination"
            exportData={displayExaminations}
            fullData={examinations}
            onImportSuccess={fetchExaminations}
            fileNamePrefix="体检记录"
            requiredFields={['工号', '体检日期', '体检结果']}
          />
          <Button 
            type="default" 
            icon={<HistoryOutlined />}
            onClick={() => navigate('/medical-examinations/operation-records')}
          >
            操作记录
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddExamination}
          >
            添加体检记录
          </Button>
        </Space>
      }
    >
      <CollapsibleFilter
        form={form}
        onValuesChange={handleSearch}
        onClear={handleClearFilters}
        maxVisibleItems={2}
        extraActions={
          <Button type="primary" onClick={handleFilterAbnormalRecords}>
            筛选异常记录
          </Button>
        }
      >
        <Form.Item name="employee_name" label="员工姓名">
          <Input placeholder="请输入员工姓名" />
        </Form.Item>
        <Form.Item name="examination_date" label="体检日期">
          <DatePicker 
            format="YYYY-MM-DD" 
            style={{ width: '100%' }}
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
      </CollapsibleFilter>

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

      {/* 添加/编辑体检记录模态框 */}
      <Modal
        title={modalType === 'add' ? '添加体检记录' : '编辑体检记录'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        confirmLoading={submitLoading}
        width={800}
        okText="确定"
        cancelText="取消"
      >
        <Form
          form={modalForm}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="employee_name"
                label="员工姓名"
                rules={[{ required: true, message: '请输入员工姓名' }]}
              >
                <Input placeholder="请输入员工姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="examination_date"
                label="体检日期"
                rules={[{ required: true, message: '请选择体检日期' }]}
              >
                <DatePicker 
                  format="YYYY-MM-DD" 
                  style={{ width: '100%' }}
                  placeholder="请选择体检日期"
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
                name="audiometry_result"
                label="电测听结果"
                rules={[{ required: true, message: '请输入电测听结果' }]}
              >
                <Input placeholder="请输入电测听结果" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dust_examination_result"
                label="粉尘检查结果"
                rules={[{ required: true, message: '请输入粉尘检查结果' }]}
              >
                <Input placeholder="请输入粉尘检查结果" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="need_recheck"
                label="是否需要复查"
                rules={[{ required: true, message: '请选择是否需要复查' }]}
              >
                <Select placeholder="请选择是否需要复查">
                  <Select.Option value={0}>否</Select.Option>
                  <Select.Option value={1}>是</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="recheck_date"
                label="复查时间"
              >
                <DatePicker 
                  format="YYYY-MM-DD" 
                  style={{ width: '100%' }}
                  placeholder="请选择复查时间"
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
                name="audiometry_recheck_result"
                label="电测听复查结果"
              >
                <Input placeholder="请输入电测听复查结果" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dust_recheck_result"
                label="粉尘复查结果"
              >
                <Input placeholder="请输入粉尘复查结果" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 体检记录详情抽屉 */}
      <Drawer
        title="体检记录详情"
        placement="right"
        onClose={handleCloseDetailDrawer}
        open={isDetailDrawerVisible}
        width={600}
      >
        {detailExamination && (
          <div style={{ padding: '16px 0' }}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>员工姓名：</strong>
                  <span style={{ marginLeft: 8 }}>{detailExamination.employee_name}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>体检日期：</strong>
                  <span style={{ marginLeft: 8 }}>
                    {detailExamination.examination_date ? dayjs(detailExamination.examination_date).format('YYYY年MM月DD日') : '-'}
                  </span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>电测听结果：</strong>
                  <span style={{ marginLeft: 8 }}>{detailExamination.audiometry_result || '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>粉尘检查结果：</strong>
                  <span style={{ marginLeft: 8 }}>{detailExamination.dust_examination_result || '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>是否需要复查：</strong>
                  <span style={{ marginLeft: 8 }}>{detailExamination.need_recheck === 1 ? '是' : '否'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>复查时间：</strong>
                  <span style={{ marginLeft: 8 }}>
                    {detailExamination.recheck_date ? dayjs(detailExamination.recheck_date).format('YYYY年MM月DD日') : '-'}
                  </span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>电测听复查结果：</strong>
                  <span style={{ marginLeft: 8 }}>{detailExamination.audiometry_recheck_result || '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ marginBottom: 16 }}>
                  <strong>粉尘复查结果：</strong>
                  <span style={{ marginLeft: 8 }}>{detailExamination.dust_recheck_result || '-'}</span>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Drawer>
    </Card>
  );
};

export default MedicalExaminations;