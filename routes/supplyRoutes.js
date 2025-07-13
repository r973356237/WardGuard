const express = require('express');
const router = express.Router();
const supplyController = require('../controllers/supplyController');
const { authenticate } = require('../middleware/auth');

// 获取所有物资（需认证）
router.get('/', authenticate, supplyController.getAllSupplies);
console.log('获取物资列表路由已加载');

// 添加新物资（需认证）
router.post('/', authenticate, supplyController.addSupply);
console.log('添加物资路由已加载');

// 更新物资信息（需认证）
router.put('/:id', authenticate, supplyController.updateSupply);
console.log('更新物资路由已加载');

// 删除物资（需认证）
router.delete('/:id', authenticate, supplyController.deleteSupply);
console.log('删除物资路由已加载');

module.exports = router;