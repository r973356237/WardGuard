const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/check_permission');

// 获取所有人员
router.get('/', authenticate, checkPermission('employees:view'), employeeController.getAllEmployees);

// 添加新人员
router.post('/', authenticate, checkPermission('employees:add'), employeeController.addEmployee);

// 批量导入人员
router.post('/batch-import', authenticate, checkPermission('employees:import'), employeeController.batchImportEmployees);

// 更新人员信息
router.put('/:id', authenticate, checkPermission('employees:edit'), employeeController.updateEmployee);

// 删除人员
router.delete('/:id', authenticate, checkPermission('employees:delete'), employeeController.deleteEmployee);

// 根据工号获取人员
router.get('/number/:employee_number', authenticate, checkPermission('employees:view'), employeeController.getEmployeeByNumber);

module.exports = router;