// PM2 (without Docker):  npm ci && npm run build && pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: 'kibabu-cars',
      script: 'dist/kibabu-cars/server/server.mjs',
      node_args: '--env-file=.env',
      instances: 1, // the JSON database must have exactly one writer: keep this at 1
      exec_mode: 'fork',
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
      time: true,
    },
  ],
};
