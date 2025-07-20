import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG } from './api';

// 扩展 AxiosRequestConfig 接口以支持重试配置
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retryCount?: number;
  _retryConfig?: {
    retries: number;
    retryDelay: number;
    retryCondition: (error: AxiosError) => boolean;
  };
}

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 15000, // 增加超时时间到15秒
  headers: {
    'Content-Type': 'application/json',
  },
});

// 默认重试配置
const defaultRetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // 重试条件：网络错误、超时、5xx服务器错误
    return !error.response || 
           error.code === 'ECONNABORTED' || 
           (error.response.status >= 500 && error.response.status < 600);
  }
};

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 请求拦截器
apiClient.interceptors.request.use(
  (config: any) => {
    // 自动添加认证 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        data: config.data
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 开发环境日志
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig;
    
    // 开发环境错误日志
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Error:', {
        status: error.response?.status,
        url: config?.url,
        message: error.message,
        data: error.response?.data
      });
    }

    // 处理 401 认证错误
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // 重试逻辑
    if (config && shouldRetry(error, config)) {
      config._retryCount = config._retryCount || 0;
      const retryConfig = config._retryConfig || defaultRetryConfig;
      
      if (config._retryCount < retryConfig.retries) {
        config._retryCount++;
        
        // 指数退避延迟
        const delayTime = retryConfig.retryDelay * Math.pow(2, config._retryCount - 1);
        
        console.log(`🔄 Retrying request (${config._retryCount}/${retryConfig.retries}) after ${delayTime}ms...`);
        
        await delay(delayTime);
        return apiClient(config);
      }
    }

    // 增强错误消息
    const enhancedError = {
      ...error,
      message: getErrorMessage(error)
    };

    return Promise.reject(enhancedError);
  }
);

// 判断是否应该重试
function shouldRetry(error: AxiosError, config: ExtendedAxiosRequestConfig): boolean {
  const retryConfig = config._retryConfig || defaultRetryConfig;
  return retryConfig.retryCondition(error);
}

// 获取错误消息
function getErrorMessage(error: AxiosError): string {
  if (error.response) {
    // 服务器响应错误
    const status = error.response.status;
    const data = error.response.data as any;
    
    if (data?.message) {
      return data.message;
    }
    
    switch (status) {
      case 400:
        return '请求参数错误';
      case 401:
        return '未授权访问';
      case 403:
        return '禁止访问';
      case 404:
        return '请求的资源不存在';
      case 500:
        return '服务器内部错误';
      case 502:
        return '网关错误';
      case 503:
        return '服务不可用';
      default:
        return `请求失败 (${status})`;
    }
  } else if (error.request) {
    // 网络错误
    if (error.code === 'ECONNABORTED') {
      return '请求超时，请检查网络连接';
    }
    return '网络连接失败，请检查网络设置';
  } else {
    // 其他错误
    return error.message || '未知错误';
  }
}

// 创建带重试配置的请求方法
export function createRequestWithRetry(retryConfig?: Partial<typeof defaultRetryConfig>) {
  const finalRetryConfig = { ...defaultRetryConfig, ...retryConfig };
  
  return {
    get: (url: string, config?: AxiosRequestConfig) => 
      apiClient.get(url, { ...config, _retryConfig: finalRetryConfig } as ExtendedAxiosRequestConfig),
    post: (url: string, data?: any, config?: AxiosRequestConfig) => 
      apiClient.post(url, data, { ...config, _retryConfig: finalRetryConfig } as ExtendedAxiosRequestConfig),
    put: (url: string, data?: any, config?: AxiosRequestConfig) => 
      apiClient.put(url, data, { ...config, _retryConfig: finalRetryConfig } as ExtendedAxiosRequestConfig),
    delete: (url: string, config?: AxiosRequestConfig) => 
      apiClient.delete(url, { ...config, _retryConfig: finalRetryConfig } as ExtendedAxiosRequestConfig),
  };
}

// 服务器健康检查
export async function checkServerHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.warn('服务器健康检查失败:', error);
    return false;
  }
}

// 等待服务器就绪
export async function waitForServer(maxAttempts: number = 10, interval: number = 1000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await checkServerHealth()) {
      console.log('✅ 服务器已就绪');
      return true;
    }
    console.log(`⏳ 等待服务器就绪... (${i + 1}/${maxAttempts})`);
    await delay(interval);
  }
  console.error('❌ 服务器启动超时');
  return false;
}

export default apiClient;