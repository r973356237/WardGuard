import React, { useState } from 'react';
import { Button, Upload, Modal, message, Space, Divider, Alert, List } from 'antd';
import { DownloadOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import apiClient from '../config/axios';
import { API_ENDPOINTS } from '../config/api';
import { 
  exportToExcel, 
  generateTemplate, 
  importFromExcel, 
  validateImportData,
  transformImportData,
  transformExportData,
  employeeTemplate,
  medicineTemplate,
  supplyTemplate,
  medicalExaminationTemplate
} from '../utils/importExport';

interface ImportExportProps {
  // 数据类型
  dataType: 'employee' | 'medicine' | 'supply' | 'medicalExamination';
  // 当前显示的数据（用于导出）
  exportData: any[];
  // 完整数据（用于导出全部数据）
  fullData?: any[];
  // 导入成功回调
  onImportSuccess: (data: any[]) => void;
  // 导出文件名前缀
  fileNamePrefix: string;
  // 必填字段列表
  requiredFields: string[];
}

const ImportExportButtons: React.FC<ImportExportProps> = ({
  dataType,
  exportData,
  fullData,
  onImportSuccess,
  fileNamePrefix,
  requiredFields
}) => {
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importData, setImportData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // 获取模板数据
  const getTemplateData = () => {
    switch (dataType) {
      case 'employee':
        return employeeTemplate;
      case 'medicine':
        return medicineTemplate;
      case 'supply':
        return supplyTemplate;
      case 'medicalExamination':
        return medicalExaminationTemplate;
      default:
        return [];
    }
  };

  // 导出数据
  const handleExport = (useFullData = false) => {
    const dataToExport = useFullData ? fullData : exportData;
    
    if (!dataToExport || dataToExport.length === 0) {
      message.warning('没有数据可以导出');
      return;
    }

    const transformedData = transformExportData(dataToExport, dataType);
    const fileName = `${fileNamePrefix}_${useFullData ? '全部' : '当前页'}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`;
    
    const success = exportToExcel(
      transformedData,
      fileName,
      fileNamePrefix
    );

    if (success) {
      message.success(`成功导出${useFullData ? '全部' : '当前页'}数据`);
    } else {
      message.error('导出失败');
    }
  };

  // 下载导入模板
  const handleDownloadTemplate = () => {
    const templateData = getTemplateData();
    const success = generateTemplate(templateData, fileNamePrefix);
    
    if (success) {
      message.success('模板下载成功');
    } else {
      message.error('模板下载失败');
    }
  };

  // 处理文件上传
  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const data = await importFromExcel(file);
      
      // 先验证原始数据（中文字段名）
      const validation = validateImportData(data, requiredFields);
      
      if (validation.isValid) {
        // 验证通过后再转换字段名
        const transformedData = transformImportData(data, dataType);
        setImportData(transformedData);
        setValidationErrors([]);
        message.success(`成功读取 ${transformedData.length} 条数据`);
      } else {
        setValidationErrors(validation.errors);
        setImportData([]);
        message.error('数据验证失败，请检查文件格式');
      }
    } catch (error) {
        message.error('文件读取失败');
        setImportData([]);
        setValidationErrors([]);
      } finally {
        setUploading(false);
      }
  };

  // 确认导入
  const handleConfirmImport = async () => {
    if (importData.length === 0) {
      message.warning('没有有效数据可以导入');
      return;
    }

    try {
      setUploading(true);
      
      // 根据数据类型调用不同的API
      let apiUrl = '';
      let requestData = {};
      
      switch (dataType) {
        case 'medicine':
          apiUrl = `${API_ENDPOINTS.MEDICINES}/batch-import`;
          requestData = { medicines: importData };
          break;
        case 'employee':
          apiUrl = `${API_ENDPOINTS.EMPLOYEES}/batch-import`;
          requestData = { employees: importData };
          break;
        case 'supply':
          apiUrl = `${API_ENDPOINTS.SUPPLIES}/batch-import`;
          requestData = { supplies: importData };
          break;
        case 'medicalExamination':
          apiUrl = `${API_ENDPOINTS.MEDICAL_EXAMINATIONS}/batch-import`;
          requestData = { examinations: importData };
          break;
        default:
          throw new Error('不支持的数据类型');
      }

      const response = await apiClient.post(apiUrl, requestData);
      
      if (response.data.success) {
        message.success(response.data.message || `成功导入 ${importData.length} 条数据`);
        onImportSuccess(importData); // 调用回调函数刷新页面数据
        setImportModalVisible(false);
        setFileList([]);
        setImportData([]);
        setValidationErrors([]);
      } else {
        message.error(response.data.message || '导入失败');
      }
    } catch (error: any) {
      message.error('导入失败');
    } finally {
      setUploading(false);
    }
  };

  // 取消导入
  const handleCancelImport = () => {
    setImportModalVisible(false);
    setFileList([]);
    setImportData([]);
    setValidationErrors([]);
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      const isExcel = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                     file.type === 'application/vnd.ms-excel';
      
      if (!isExcel) {
        message.error('只能上传Excel文件！');
        return false;
      }

      // 为文件添加uid属性后再转换为UploadFile类型
      const uploadFile = {
        ...file,
        uid: Date.now().toString() // 添加唯一标识符
      } as unknown as UploadFile;
      setFileList([uploadFile]);
      handleFileUpload(file);
      return false; // 阻止自动上传
    },
    fileList,
    onRemove: () => {
      setFileList([]);
      setImportData([]);
      setValidationErrors([]);
    },
  };

  return (
    <>
      <Space>
        <Button 
          type="default" 
          icon={<DownloadOutlined />}
          onClick={() => handleExport(false)}
          disabled={exportData.length === 0}
        >
          导出当前页
        </Button>
        {fullData && fullData.length > 0 && (
          <Button 
            type="default" 
            icon={<DownloadOutlined />}
            onClick={() => handleExport(true)}
          >
            导出全部数据
          </Button>
        )}
        <Button 
          type="primary" 
          icon={<UploadOutlined />}
          onClick={() => setImportModalVisible(true)}
        >
          导入数据
        </Button>
      </Space>

      <Modal
        title="导入数据"
        open={importModalVisible}
        onOk={handleConfirmImport}
        onCancel={handleCancelImport}
        width={600}
        okText="确认导入"
        cancelText="取消"
        okButtonProps={{ 
          disabled: importData.length === 0 || validationErrors.length > 0,
          loading: uploading 
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="导入说明"
            description={
              <div>
                <p>1. 请先下载导入模板，按照模板格式填写数据</p>
                <p>2. 支持 .xlsx 和 .xls 格式的Excel文件</p>
                <p>3. 请确保必填字段不为空</p>
                <p>4. 日期格式请使用：YYYY-MM-DD（如：2024-01-01）</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        </div>

        <div style={{ marginBottom: 16, textAlign: 'center' }}>
          <Button 
            type="default" 
            icon={<FileExcelOutlined />}
            onClick={handleDownloadTemplate}
          >
            下载导入模板
          </Button>
        </div>

        <Divider>选择文件</Divider>
        
        <Upload.Dragger {...uploadProps} style={{ marginBottom: 16 }}>
          <p className="ant-upload-drag-icon">
            <FileExcelOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
          <p className="ant-upload-hint">支持 .xlsx 和 .xls 格式</p>
        </Upload.Dragger>

        {validationErrors.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message="数据验证失败"
              description={
                <List
                  size="small"
                  dataSource={validationErrors}
                  renderItem={error => <List.Item>{error}</List.Item>}
                />
              }
              type="error"
              showIcon
            />
          </div>
        )}

        {importData.length > 0 && validationErrors.length === 0 && (
          <div style={{ marginTop: 16 }}>
            <Alert
              message={`数据验证通过，共 ${importData.length} 条数据`}
              description="点击确认导入按钮完成数据导入"
              type="success"
              showIcon
            />
          </div>
        )}
      </Modal>
    </>
  );
};

export default ImportExportButtons;