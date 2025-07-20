/**
 * 表单验证工具
 * 提供统一的前端表单验证规则
 */

/**
 * 常用验证规则
 */
export const ValidationRules = {
  // 用户名验证
  username: [
    { required: true, message: '请输入用户名' },
    { min: 3, message: '用户名至少3个字符' },
    { max: 20, message: '用户名最多20个字符' },
    { 
      pattern: /^[a-zA-Z0-9_]+$/, 
      message: '用户名只能包含字母、数字和下划线' 
    }
  ],

  // 姓名验证
  name: [
    { required: true, message: '请输入姓名' },
    { max: 50, message: '姓名最多50个字符' }
  ],

  // 邮箱验证
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email' as const, message: '请输入有效的邮箱地址' }
  ],

  // 密码验证
  password: [
    { required: true, message: '请输入密码' },
    { min: 6, message: '密码至少6个字符' },
    { max: 100, message: '密码最多100个字符' }
  ],

  // 确认密码验证
  confirmPassword: (getFieldValue: (name: string) => any) => [
    { required: true, message: '请确认密码' },
    {
      validator(_: any, value: string) {
        if (!value || getFieldValue('password') === value) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('两次输入的密码不一致'));
      },
    },
  ],

  // 角色验证
  role: [
    { required: true, message: '请选择角色' }
  ],

  // 状态验证
  status: [
    { required: true, message: '请选择状态' }
  ],

  // 手机号验证
  phone: [
    { 
      pattern: /^1[3-9]\d{9}$/, 
      message: '请输入有效的手机号码' 
    }
  ],

  // 身份证验证
  idCard: [
    { 
      pattern: /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/, 
      message: '请输入有效的身份证号码' 
    }
  ],

  // 工号验证
  employeeId: [
    { required: true, message: '请输入工号' },
    { 
      pattern: /^[A-Z0-9]+$/, 
      message: '工号只能包含大写字母和数字' 
    }
  ],

  // 数量验证
  quantity: [
    { required: true, message: '请输入数量' },
    { 
      type: 'number' as const, 
      min: 0, 
      message: '数量不能小于0' 
    }
  ],

  // 价格验证
  price: [
    { required: true, message: '请输入价格' },
    { 
      type: 'number' as const, 
      min: 0, 
      message: '价格不能小于0' 
    }
  ],

  // 日期验证
  date: [
    { required: true, message: '请选择日期' }
  ],

  // 必填文本
  requiredText: [
    { required: true, message: '此字段为必填项' }
  ],

  // 可选文本
  optionalText: [
    { max: 500, message: '内容最多500个字符' }
  ]
};

/**
 * 自定义验证器
 */
export const CustomValidators = {
  /**
   * 验证用户名唯一性
   */
  uniqueUsername: (excludeId?: number) => ({
    async validator(_: any, value: string) {
      if (!value) return Promise.resolve();
      
      // 这里应该调用API检查用户名是否存在
      // const exists = await checkUsernameExists(value, excludeId);
      // if (exists) {
      //   return Promise.reject(new Error('用户名已存在'));
      // }
      return Promise.resolve();
    },
  }),

  /**
   * 验证邮箱唯一性
   */
  uniqueEmail: (excludeId?: number) => ({
    async validator(_: any, value: string) {
      if (!value) return Promise.resolve();
      
      // 这里应该调用API检查邮箱是否存在
      // const exists = await checkEmailExists(value, excludeId);
      // if (exists) {
      //   return Promise.reject(new Error('邮箱已存在'));
      // }
      return Promise.resolve();
    },
  }),

  /**
   * 验证文件大小
   */
  fileSize: (maxSize: number) => ({
    validator(_: any, value: any) {
      if (!value || !value.file) return Promise.resolve();
      
      if (value.file.size > maxSize) {
        return Promise.reject(new Error(`文件大小不能超过${maxSize / 1024 / 1024}MB`));
      }
      return Promise.resolve();
    },
  }),

  /**
   * 验证文件类型
   */
  fileType: (allowedTypes: string[]) => ({
    validator(_: any, value: any) {
      if (!value || !value.file) return Promise.resolve();
      
      const fileType = value.file.type;
      if (!allowedTypes.includes(fileType)) {
        return Promise.reject(new Error(`只允许上传${allowedTypes.join('、')}格式的文件`));
      }
      return Promise.resolve();
    },
  })
};

/**
 * 表单初始值生成器
 */
export const FormDefaults = {
  user: {
    role: 'user',
    status: 'active'
  },
  
  employee: {
    status: 'active'
  },
  
  supply: {
    quantity: 0,
    unit: '个'
  },
  
  medicine: {
    quantity: 0,
    unit: '盒'
  }
};

export default ValidationRules;