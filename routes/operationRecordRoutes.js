const express = require('express');
const router = express.Router();
const operationRecordController = require('../controllers/operationRecordController');

// 获取所有操作记录
router.get('/', operationRecordController.getAllOperationRecords);
console.log('获取操作记录列表路由已加载');

module.exports = router;