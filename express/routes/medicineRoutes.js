const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticate } = require('../middleware/auth');

// 获取所有药品（需认证）
router.get('/', medicineController.getAllMedicines);
console.log('获取药品列表路由已加载');

// 添加新药品（需认证）
router.post('/', medicineController.addMedicine);
console.log('添加药品路由已加载');

// 更新药品信息（需认证）
router.put('/:id', medicineController.updateMedicine);
console.log('更新药品路由已加载');

// 删除药品（需认证）
router.delete('/:id', medicineController.deleteMedicine);
console.log('删除药品路由已加载');

module.exports = router;