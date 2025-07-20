/**
 * 数据验证工具
 * 提供统一的数据验证功能
 */

/**
 * 验证规则定义
 */
const ValidationRules = {
  // 用户相关验证
  username: {
    required: true,
    type: 'string',
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    message: '用户名必须是3-20位字母、数字或下划线'
  },
  
  name: {
    required: true,
    type: 'string',
    minLength: 1,
    maxLength: 50,
    message: '姓名必须是1-50个字符'
  },
  
  email: {
    required: true,
    type: 'email',
    message: '请输入有效的邮箱地址'
  },
  
  password: {
    required: true,
    type: 'string',
    minLength: 6,
    maxLength: 100,
    message: '密码必须是6-100个字符'
  },
  
  role: {
    required: true,
    type: 'enum',
    values: ['admin', 'user'],
    message: '角色必须是admin或user'
  },
  
  status: {
    required: true,
    type: 'enum',
    values: ['active', 'inactive'],
    message: '状态必须是active或inactive'
  }
};

/**
 * 验证器类
 */
class Validator {
  constructor() {
    this.errors = [];
  }

  /**
   * 验证单个字段
   */
  validateField(fieldName, value, rules) {
    const rule = rules[fieldName];
    if (!rule) return true;

    // 必填验证
    if (rule.required && (value === undefined || value === null || value === '')) {
      this.errors.push(`${fieldName}是必填字段`);
      return false;
    }

    // 如果不是必填且值为空，跳过其他验证
    if (!rule.required && (value === undefined || value === null || value === '')) {
      return true;
    }

    // 类型验证
    if (rule.type === 'string' && typeof value !== 'string') {
      this.errors.push(`${fieldName}必须是字符串类型`);
      return false;
    }

    if (rule.type === 'number' && typeof value !== 'number') {
      this.errors.push(`${fieldName}必须是数字类型`);
      return false;
    }

    if (rule.type === 'email' && !this.isValidEmail(value)) {
      this.errors.push(rule.message || `${fieldName}格式不正确`);
      return false;
    }

    // 长度验证
    if (rule.minLength && value.length < rule.minLength) {
      this.errors.push(rule.message || `${fieldName}长度不能少于${rule.minLength}个字符`);
      return false;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      this.errors.push(rule.message || `${fieldName}长度不能超过${rule.maxLength}个字符`);
      return false;
    }

    // 正则验证
    if (rule.pattern && !rule.pattern.test(value)) {
      this.errors.push(rule.message || `${fieldName}格式不正确`);
      return false;
    }

    // 枚举验证
    if (rule.type === 'enum' && !rule.values.includes(value)) {
      this.errors.push(rule.message || `${fieldName}值不在允许范围内`);
      return false;
    }

    return true;
  }

  /**
   * 验证对象
   */
  validate(data, rules) {
    this.errors = [];
    
    for (const [fieldName, value] of Object.entries(data)) {
      this.validateField(fieldName, value, rules);
    }

    // 检查必填字段是否缺失
    for (const [fieldName, rule] of Object.entries(rules)) {
      if (rule.required && !(fieldName in data)) {
        this.errors.push(`缺少必填字段: ${fieldName}`);
      }
    }

    return this.errors.length === 0;
  }

  /**
   * 获取验证错误
   */
  getErrors() {
    return this.errors;
  }

  /**
   * 获取第一个错误
   */
  getFirstError() {
    return this.errors[0] || null;
  }

  /**
   * 邮箱格式验证
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * 验证中间件生成器
 */
const createValidationMiddleware = (rules) => {
  return (req, res, next) => {
    const validator = new Validator();
    
    if (!validator.validate(req.body, rules)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '数据验证失败',
          details: validator.getErrors()
        }
      });
    }
    
    next();
  };
};

/**
 * 预定义的验证中间件
 */
const userValidation = {
  create: createValidationMiddleware({
    username: ValidationRules.username,
    name: ValidationRules.name,
    email: ValidationRules.email,
    password: ValidationRules.password,
    role: ValidationRules.role,
    status: ValidationRules.status
  }),
  
  update: createValidationMiddleware({
    username: { ...ValidationRules.username, required: false },
    name: { ...ValidationRules.name, required: false },
    email: { ...ValidationRules.email, required: false },
    role: { ...ValidationRules.role, required: false },
    status: { ...ValidationRules.status, required: false }
  }),
  
  login: createValidationMiddleware({
    username: ValidationRules.username,
    password: ValidationRules.password
  }),
  
  register: createValidationMiddleware({
    username: ValidationRules.username,
    name: ValidationRules.name,
    email: ValidationRules.email,
    password: ValidationRules.password
  })
};

module.exports = {
  Validator,
  ValidationRules,
  createValidationMiddleware,
  userValidation
};