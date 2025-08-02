const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { authenticate } = require('../middleware/auth');
const checkPermission = require('../middleware/check_permission');

// 获取所有药品
router.get('/', authenticate, checkPermission('medicines:view'), medicineController.getAllMedicines);

// 添加新药品
router.post('/', authenticate, checkPermission('medicines:add'), medicineController.addMedicine);

// 批量导入药品
router.post('/batch-import', authenticate, checkPermission('medicines:import'), medicineController.batchImportMedicines);

// 批量操作药品（必须在参数路由之前）
router.put('/batch', authenticate, checkPermission('medicines:edit'), medicineController.batchUpdateMedicines);
router.delete('/batch', authenticate, checkPermission('medicines:delete'), medicineController.batchDeleteMedicines);

// 导出药品
router.get('/export', authenticate, checkPermission('medicines:export'), medicineController.exportMedicines);

// 更新药品信息
router.put('/:id', authenticate, checkPermission('medicines:edit'), medicineController.updateMedicine);

// 删除药品
router.delete('/:id', authenticate, checkPermission('medicines:delete'), medicineController.deleteMedicine);

module.exports = router;