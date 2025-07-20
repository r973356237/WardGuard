/**
 * API客户端工具类
 * 提供统一的API调用接口和错误处理
 */

import { message } from 'antd';
import apiClient from '../config/axios';

/**
 * API响应类型定义
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string[];
  };
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API客户端类
 */
class ApiClient {
  /**
   * 处理API响应
   */
  private static handleResponse<T>(response: any): ApiResponse<T> {
    if (response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data.error?.message || '请求失败');
    }
  }

  /**
   * 处理API错误
   */
  private static handleError(error: any): never {
    console.error('API请求错误:', error);
    
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      message.error(apiError.message);
      throw new Error(apiError.message);
    } else if (error.message) {
      message.error(error.message);
      throw error;
    } else {
      const defaultMessage = '网络请求失败，请稍后重试';
      message.error(defaultMessage);
      throw new Error(defaultMessage);
    }
  }

  /**
   * GET请求
   */
  static async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.get(url, { params });
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * POST请求
   */
  static async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.post(url, data);
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * PUT请求
   */
  static async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.put(url, data);
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE请求
   */
  static async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      const response = await apiClient.delete(url);
      return this.handleResponse<T>(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export default ApiClient;