module.exports = {
  apps: [
    {
      name: 'kiodium-web',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 44556,
        HOST: '0.0.0.0',
      },
    },
  ],
};
