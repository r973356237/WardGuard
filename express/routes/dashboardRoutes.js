const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

// 获取仪表盘统计数据（需认证）
router.get('/stats', authenticate, dashboardController.getDashboardStats);
console.log('仪表盘统计数据路由已加载');

// 获取系统健康状态（需认证）
router.get('/health', authenticate, dashboardController.getSystemHealth);
console.log('系统健康状态路由已加载');

module.exports = router;