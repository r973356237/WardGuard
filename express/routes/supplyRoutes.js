const express = require('express');
const router = express.Router();
const { 
  getAllSupplies,
  addSupply,
  updateSupply,
  deleteSupply,
  batchImportSupplies,
  exportSupplies,
  batchUpdateSupplies,
  batchDeleteSupplies
} = require('../controllers/supplyController');
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/check_permission');

// 获取所有物资
router.get('/', authenticate, checkPermission('supplies:view'), getAllSupplies);

// 添加新物资
router.post('/', authenticate, checkPermission('supplies:add'), addSupply);

// 批量导入物资
router.post('/batch-import', authenticate, checkPermission('supplies:import'), batchImportSupplies);

// 批量操作物资（必须在参数路由之前）
router.put('/batch', authenticate, checkPermission('supplies:edit'), batchUpdateSupplies);
router.delete('/batch', authenticate, checkPermission('supplies:delete'), batchDeleteSupplies);

// 导出物资
router.get('/export', authenticate, checkPermission('supplies:export'), exportSupplies);

// 更新物资信息
router.put('/:id', authenticate, checkPermission('supplies:edit'), updateSupply);

// 删除物资
router.delete('/:id', authenticate, checkPermission('supplies:delete'), deleteSupply);

module.exports = router;