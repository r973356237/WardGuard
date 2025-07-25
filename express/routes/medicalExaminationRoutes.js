const express = require('express');
const router = express.Router();
const medicalExaminationController = require('../controllers/medicalExaminationController');
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/check_permission');

// 获取所有体检信息
router.get('/', authenticate, checkPermission('medical_examinations:view'), medicalExaminationController.getAllMedicalExaminations);

// 根据工号获取体检信息
router.get('/employee/:employee_number', authenticate, checkPermission('medical_examinations:view'), medicalExaminationController.getMedicalExaminationsByEmployeeNumber);

// 添加新体检信息
router.post('/', authenticate, checkPermission('medical_examinations:add'), medicalExaminationController.addMedicalExamination);

// 批量导入体检记录
router.post('/batch-import', authenticate, checkPermission('medical_examinations:import'), medicalExaminationController.batchImportMedicalExaminations);

// 更新体检信息
router.put('/:id', authenticate, checkPermission('medical_examinations:edit'), medicalExaminationController.updateMedicalExamination);

// 删除体检信息
router.delete('/:id', authenticate, checkPermission('medical_examinations:delete'), medicalExaminationController.deleteMedicalExamination);

// 导出体检记录
router.get('/export', authenticate, checkPermission('medical_examinations:export'), medicalExaminationController.exportMedicalExaminations);

module.exports = router;