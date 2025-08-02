module.exports = {
  apps: [{
    name: 'wardguard-backend',
    script: 'index.js',
    cwd: '/opt/WardGuard/express',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/log/pm2/wardguard-error.log',
    out_file: '/opt/log/pm2/wardguard-out.log',
    log_file: '/opt/log/pm2/wardguard.log',
    time: true
  }]
};