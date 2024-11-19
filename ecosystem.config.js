module.exports = {
  apps : [
    {
      name: 'digital-certificate-web',
      script: 'server.js',
      instances: '1',
      exec_mode: 'cluster',
      ignore_watch: ["node_modules", "logs", "uploads", "private"],
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },    
  ]
};
