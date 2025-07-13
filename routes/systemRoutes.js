const express = require('express');
const router = express.Router();
const { getSystemName, setSystemName } = require('../controllers/systemController');

// 获取系统名称
router.get('/system-name', getSystemName);

// 设置系统名称
router.post('/system-name', setSystemName);

module.exports = router;