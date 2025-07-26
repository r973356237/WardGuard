const { getDashboardStats, clearDashboardCache } = require('../controllers/dashboardController');

/**
 * 应用启动预热脚本
 * 在应用启动后预热关键数据和缓存
 */
class AppWarmup {
  constructor() {
    this.isWarmedUp = false;
    this.warmupStartTime = null;
  }

  /**
   * 执行预热
   */
  async warmup() {
    if (this.isWarmedUp) {
      console.log('✅ 应用已经预热完成');
      return;
    }

    this.warmupStartTime = Date.now();
    console.log('🔥 开始应用预热...');

    try {
      // 1. 预热仪表盘数据
      await this.warmupDashboard();

      // 2. 预热其他关键数据（如果需要）
      // await this.warmupOtherData();

      this.isWarmedUp = true;
      const warmupTime = Date.now() - this.warmupStartTime;
      console.log(`✅ 应用预热完成，耗时: ${warmupTime}ms`);

    } catch (error) {
      console.error('❌ 应用预热失败:', error.message);
      // 预热失败不应该阻止应用启动
    }
  }

  /**
   * 预热仪表盘数据
   */
  async warmupDashboard() {
    console.log('🔥 预热仪表盘数据...');
    
    try {
      // 清除可能存在的旧缓存
      clearDashboardCache();
      
      // 模拟请求对象
      const mockReq = {};
      const mockRes = {
        json: (data) => {
          if (data.success) {
            console.log('✅ 仪表盘数据预热成功');
          } else {
            console.warn('⚠️ 仪表盘数据预热失败:', data.message);
          }
        },
        status: (code) => ({
          json: (data) => {
            console.warn(`⚠️ 仪表盘数据预热失败 (${code}):`, data.message);
          }
        })
      };

      // 执行仪表盘数据获取
      await getDashboardStats(mockReq, mockRes);
      
    } catch (error) {
      console.error('❌ 仪表盘数据预热失败:', error.message);
    }
  }

  /**
   * 预热其他关键数据
   */
  async warmupOtherData() {
    console.log('🔥 预热其他关键数据...');
    
    // 这里可以添加其他需要预热的数据
    // 例如：用户权限、系统配置等
    
    console.log('✅ 其他数据预热完成');
  }

  /**
   * 获取预热状态
   */
  getWarmupStatus() {
    return {
      isWarmedUp: this.isWarmedUp,
      warmupTime: this.warmupStartTime ? Date.now() - this.warmupStartTime : null
    };
  }
}

// 创建单例实例
const appWarmup = new AppWarmup();

module.exports = appWarmup;