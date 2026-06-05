module.exports = {
  apps: [{
    name: 'wardguard-backend',
    script: 'index.js',
    cwd: '/opt/WardGuard/express',
    // 单实例 fork 模式，适配 NAS 低功耗 CPU (N4100) + 4GB 内存
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 内存限制：超过 300MB 自动重启，防止内存泄漏
    max_memory_restart: '300M',
    node_args: '--max-old-space-size=256',
    // 日志路径（需提前创建目录：mkdir -p /opt/WardGuard/logs）
    error_file: '/opt/WardGuard/logs/error.log',
    out_file: '/opt/WardGuard/logs/out.log',
    log_file: '/opt/WardGuard/logs/combined.log',
    time: true,
    // 异常退出时自动重启，最多连续重启 10 次
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000
  }]
};