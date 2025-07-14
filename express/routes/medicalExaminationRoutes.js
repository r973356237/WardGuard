const express = require('express');
const router = express.Router();
const medicalExaminationController = require('../controllers/medicalExaminationController');

// 获取所有体检信息
router.get('/', medicalExaminationController.getAllMedicalExaminations);
console.log('获取体检信息列表路由已加载');

// 根据工号获取体检信息
router.get('/employee/:employee_number', medicalExaminationController.getMedicalExaminationsByEmployeeNumber);
console.log('根据工号获取体检信息路由已加载');

// 添加新体检信息
router.post('/', medicalExaminationController.addMedicalExamination);
console.log('添加体检信息路由已加载');

// 更新体检信息
router.put('/:id', medicalExaminationController.updateMedicalExamination);
console.log('更新体检信息路由已加载');

// 删除体检信息
router.delete('/:id', medicalExaminationController.deleteMedicalExamination);
console.log('删除体检信息路由已加载');

module.exports = router;