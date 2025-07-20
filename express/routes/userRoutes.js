const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// 用户注册
router.post('/register', userController.register);
console.log('注册路由已加载');

// 用户登录
router.post('/login', userController.login);
console.log('登录路由已加载');

// 获取当前用户信息（需认证）
router.get('/me', authenticate, userController.getMe);
console.log('获取用户信息路由已加载');

// 获取所有用户（需认证）
router.get('/', authenticate, userController.getAllUsers);
console.log('获取所有用户路由已加载');

// 创建用户（需认证）
router.post('/', authenticate, userController.createUser);
console.log('创建用户路由已加载');

// 更新用户（需认证）
router.put('/:id', authenticate, userController.updateUser);
console.log('更新用户路由已加载');

// 删除用户（需认证）
router.delete('/:id', authenticate, userController.deleteUser);
console.log('删除用户路由已加载');

module.exports = router;