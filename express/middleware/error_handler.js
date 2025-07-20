/**
 * 统一错误处理中间件
 * 提供标准化的错误响应格式
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 业务错误类型
 */
const ErrorTypes = {
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', statusCode: 400 },
  NOT_FOUND: { code: 'NOT_FOUND', statusCode: 404 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', statusCode: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', statusCode: 403 },
  CONFLICT: { code: 'CONFLICT', statusCode: 409 },
  DATABASE_ERROR: { code: 'DATABASE_ERROR', statusCode: 500 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', statusCode: 500 }
};

/**
 * 创建特定类型的错误
 */
const createError = (type, message) => {
  const errorType = ErrorTypes[type] || ErrorTypes.INTERNAL_ERROR;
  return new AppError(message, errorType.statusCode, errorType.code);
};

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  console.error('错误详情:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // MySQL错误处理
  if (err.code === 'ER_DUP_ENTRY') {
    const message = '数据已存在，请检查唯一性约束';
    error = createError('CONFLICT', message);
  } else if (err.code === 'ER_BAD_FIELD_ERROR') {
    const message = '数据库字段错误，请联系管理员';
    error = createError('DATABASE_ERROR', message);
  } else if (err.code === 'ER_NO_SUCH_TABLE') {
    const message = '数据库表不存在，请联系管理员';
    error = createError('DATABASE_ERROR', message);
  }

  // JWT错误处理
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的访问令牌';
    error = createError('UNAUTHORIZED', message);
  } else if (err.name === 'TokenExpiredError') {
    const message = '访问令牌已过期';
    error = createError('UNAUTHORIZED', message);
  }

  // 验证错误处理
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = createError('VALIDATION_ERROR', message);
  }

  // 发送错误响应
  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || '服务器内部错误'
    },
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

/**
 * 404错误处理
 */
const notFoundHandler = (req, res, next) => {
  const error = createError('NOT_FOUND', `路由 ${req.originalUrl} 不存在`);
  next(error);
};

/**
 * 异步错误捕获包装器
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  ErrorTypes,
  createError,
  errorHandler,
  notFoundHandler,
  asyncHandler
};