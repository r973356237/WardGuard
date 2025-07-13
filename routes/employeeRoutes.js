const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// 获取所有人员
router.get('/', employeeController.getAllEmployees);
console.log('获取人员列表路由已加载');

// 添加新人员
router.post('/', employeeController.addEmployee);
console.log('添加人员路由已加载');

// 更新人员信息
router.put('/:id', employeeController.updateEmployee);
console.log('更新人员路由已加载');

// 删除人员
router.delete('/:id', employeeController.deleteEmployee);
console.log('删除人员路由已加载');

// 根据工号获取人员
router.get('/number/:employee_number', employeeController.getEmployeeByNumber);
console.log('根据工号获取人员路由已加载');

module.exports = router;