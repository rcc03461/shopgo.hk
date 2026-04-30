module.exports = {
  apps: [
    {
      name: 'hxm-oshop',
      cwd: __dirname + '/../..',
      script: '.output/server/index.mjs',
      interpreter: 'node',
      node_args: '--max-old-space-size=4096',
      exec_mode: 'cluster',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1024M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      merge_logs: true,
      env: {
        NODE_ENV: 'production',
        NITRO_PORT: 8555,
        PORT: 8555
      }
    }
  ]
};
