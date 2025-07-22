const express = require('express');
const router = express.Router();
const operationRecordController = require('../controllers/operationRecordController');
const { authenticate } = require('../middleware/auth');

// 获取所有操作记录
router.get('/', authenticate, operationRecordController.getAllOperationRecords);
console.log('获取操作记录列表路由已加载');

// 获取用户操作记录
router.get('/user/:userId', authenticate, operationRecordController.getUserOperationRecords);
console.log('获取用户操作记录路由已加载');

// 获取操作记录详情
router.get('/:id', authenticate, operationRecordController.getOperationRecordDetail);
console.log('获取操作记录详情路由已加载');

module.exports = router;